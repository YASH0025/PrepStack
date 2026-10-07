import { type RevisionSheetState } from "./schemas";

export interface RevisionSheetStateRepository {
  checkedKeys(roundId: string): Promise<string[]>;
  setChecked(roundId: string, key: string, checked: boolean): Promise<string[]>;
  deleteForRounds(roundIds: string[]): Promise<void>;
  list(): Promise<RevisionSheetState[]>;
}
