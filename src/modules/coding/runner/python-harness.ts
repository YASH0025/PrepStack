/*
 * Python side of the test harness, loaded into Pyodide (in the browser worker
 * and in the Node solution test). Mirrors harness.ts: the same ListNode /
 * TreeNode formats, and outputs returned as JSON for comparison in JS.
 *
 *   _ps_load(code)                 -> JSON {"error": str | None}
 *   _ps_run(spec_json, args_json)  -> JSON {"output", "stdout", "timeMs", "error"}
 */
export const PYTHON_HARNESS = String.raw`
import io as _ps_io
import json as _ps_json
import sys as _ps_sys
import time as _ps_time
import traceback as _ps_traceback

_ps_sys.setrecursionlimit(10000)

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

_PS_MAX_NODES = 100000

def _ps_to_list(values):
    head = ListNode()
    tail = head
    for v in values or []:
        tail.next = ListNode(v)
        tail = tail.next
    return head.next

def _ps_from_list(node):
    out = []
    while node is not None:
        if len(out) >= _PS_MAX_NODES:
            raise ValueError("The returned list has a cycle or is too long")
        out.append(node.val)
        node = node.next
    return out

def _ps_to_tree(values):
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = [root]
    head = 0
    i = 1
    while head < len(queue) and i < len(values):
        node = queue[head]
        head += 1
        if values[i] is not None:
            node.left = TreeNode(values[i])
            queue.append(node.left)
        i += 1
        if i >= len(values):
            break
        if values[i] is not None:
            node.right = TreeNode(values[i])
            queue.append(node.right)
        i += 1
    return root

def _ps_from_tree(root):
    out = []
    queue = [root]
    head = 0
    seen = 0
    while head < len(queue):
        node = queue[head]
        head += 1
        if node is None:
            out.append(None)
            continue
        seen += 1
        if seen > _PS_MAX_NODES:
            raise ValueError("The returned tree has a cycle or is too large")
        out.append(node.val)
        queue.append(node.left)
        queue.append(node.right)
    while out and out[-1] is None:
        out.pop()
    return out

def _ps_in(value, kind):
    if kind == "ListNode":
        return _ps_to_list(value)
    if kind == "TreeNode":
        return _ps_to_tree(value)
    return _ps_json.loads(_ps_json.dumps(value))

def _ps_plain(value):
    if isinstance(value, (set, frozenset)):
        raise TypeError("Return a list, not a set")
    if isinstance(value, tuple):
        return [_ps_plain(v) for v in value]
    if isinstance(value, list):
        return [_ps_plain(v) for v in value]
    if isinstance(value, dict):
        return {str(k): _ps_plain(v) for k, v in value.items()}
    if isinstance(value, float) and value.is_integer() and abs(value) < 2**53:
        return value
    return value

def _ps_out(value, kind):
    if kind == "void":
        return None
    if kind == "ListNode":
        return _ps_from_list(value)
    if kind == "TreeNode":
        return _ps_from_tree(value)
    return _ps_plain(value)

_ps_ns = {}

def _ps_error_text(exc):
    frames = [f for f in _ps_traceback.extract_tb(exc.__traceback__) if f.filename == "<solution>"]
    where = f" (line {frames[-1].lineno})" if frames else ""
    return f"{type(exc).__name__}: {exc}{where}"

def _ps_load(code):
    global _ps_ns
    _ps_ns = {"ListNode": ListNode, "TreeNode": TreeNode, "__name__": "solution"}
    try:
        exec("from typing import *\nimport collections, heapq, math, bisect, functools, itertools", _ps_ns)
        exec(compile(code, "<solution>", "exec"), _ps_ns)
    except SyntaxError as exc:
        return _ps_json.dumps({"error": f"SyntaxError: {exc.msg} (line {exc.lineno})"})
    except BaseException as exc:
        return _ps_json.dumps({"error": _ps_error_text(exc)})
    return _ps_json.dumps({"error": None})

def _ps_call(spec, args):
    if spec["kind"] == "function":
        fn = _ps_ns.get(spec["name"]["py"])
        if fn is None:
            sol = _ps_ns.get("Solution")
            if sol is not None and hasattr(sol, spec["name"]["py"]):
                fn = getattr(sol(), spec["name"]["py"])
        if not callable(fn):
            raise NameError(f"Define a function named {spec['name']['py']}")
        values = [_ps_in(args[i], p["type"]) for i, p in enumerate(spec["params"])]
        return _ps_out(fn(*values), spec["returns"])
    cls = _ps_ns.get(spec["className"])
    if cls is None:
        raise NameError(f"Define a class named {spec['className']}")
    operations, arguments = args
    out = []
    instance = None
    for index, op in enumerate(operations):
        raw = arguments[index] if index < len(arguments) else []
        if index == 0:
            values = [_ps_in(raw[i], p["type"]) for i, p in enumerate(spec["constructorParams"])]
            instance = cls(*values)
            out.append(None)
            continue
        method = next((m for m in spec["methods"] if m["name"] == op), None)
        target = getattr(instance, op, None)
        if method is None or not callable(target):
            raise AttributeError(f"Method {op} is not defined")
        values = [_ps_in(raw[i], p["type"]) for i, p in enumerate(method["params"])]
        out.append(_ps_out(target(*values), method["returns"]))
    return out

def _ps_run(spec_json, args_json):
    spec = _ps_json.loads(spec_json)
    args = _ps_json.loads(args_json)
    buffer = _ps_io.StringIO()
    previous = _ps_sys.stdout
    _ps_sys.stdout = buffer
    started = _ps_time.perf_counter()
    result = {"output": None, "error": None}
    try:
        result["output"] = _ps_call(spec, args)
    except RecursionError:
        result["error"] = "RecursionError: maximum recursion depth exceeded"
    except BaseException as exc:
        result["error"] = _ps_error_text(exc)
    finally:
        _ps_sys.stdout = previous
    result["timeMs"] = (_ps_time.perf_counter() - started) * 1000
    result["stdout"] = buffer.getvalue()[:4000]
    try:
        return _ps_json.dumps(result)
    except (TypeError, ValueError) as exc:
        return _ps_json.dumps({"output": None, "error": f"Could not read the returned value: {exc}", "timeMs": result["timeMs"], "stdout": result["stdout"]})
`;
