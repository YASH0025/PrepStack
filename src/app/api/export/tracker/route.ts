import { type NextRequest } from "next/server";

import { ROUND_TYPE_LABELS } from "@/lib/domain";
import { csvResponse } from "@/lib/csv";
import { formatRoundTime } from "@/lib/format";
import { todayIn } from "@/lib/local-date";
import { getUserForApi } from "@/modules/auth/service";
import { getProfile } from "@/modules/profile/service";
import {
  APPLICATION_STATUS_LABELS,
  MODE_LABELS,
  ROUND_RESULT_LABELS,
  ROUND_STATUS_LABELS,
  SOURCE_LABELS,
} from "@/modules/tracker/schemas";
import { trackerFor } from "@/modules/tracker/service";

/**
 * GET /api/export/tracker?type=applications|rounds
 * Streams the signed-in user's own tracker as CSV. Third-party people details
 * (HR, interviewers) are deliberately left out of exports.
 */
export async function GET(request: NextRequest) {
  const user = await getUserForApi();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const type = request.nextUrl.searchParams.get("type") === "rounds" ? "rounds" : "applications";
  const tracker = trackerFor(user.id);
  const timezone = (await getProfile(user.id))?.timezone ?? "UTC";
  const stamp = todayIn(timezone);

  if (type === "applications") {
    const [applications, fields] = await Promise.all([
      tracker.listApplications(),
      tracker.listCustomFields(),
    ]);
    const header = [
      "Company",
      "Job title",
      "Status",
      "Source",
      "Technologies",
      "Job link",
      "Applied on",
      "Referrer",
      "Agency",
      "Expected salary",
      "Offered salary",
      "Offer joining date",
      "Follow up",
      "Outcome",
      "Notes",
      ...fields.map((field) => field.name),
    ];
    const rows = applications.map((application) => [
      application.companyName,
      application.jobTitle,
      APPLICATION_STATUS_LABELS[application.status],
      SOURCE_LABELS[application.source],
      application.technologies,
      application.jobLink,
      application.appliedOn,
      application.referrerName,
      application.agency,
      application.expectedSalary,
      application.offeredSalary,
      application.offerJoiningDate,
      application.followUpDate,
      application.outcome,
      application.notes,
      ...fields.map((field) => application.customValues[field.id] ?? ""),
    ]);
    return csvResponse(`prepstack-applications-${stamp}.csv`, header, rows);
  }

  const [applications, rounds] = await Promise.all([
    tracker.listApplications(),
    tracker.listRounds(),
  ]);
  const byId = new Map(applications.map((application) => [application.id, application]));
  const header = [
    "Company",
    "Job title",
    "Round",
    "Type",
    "When",
    "Mode",
    "Round status",
    "Round result",
    "Cancel reason",
  ];
  const rows = rounds.map((round) => {
    const application = byId.get(round.applicationId);
    return [
      application?.companyName,
      application?.jobTitle,
      round.roundNumber,
      ROUND_TYPE_LABELS[round.type],
      formatRoundTime(round.startUtc, round.endUtc, timezone),
      MODE_LABELS[round.mode],
      ROUND_STATUS_LABELS[round.status],
      ROUND_RESULT_LABELS[round.result],
      round.cancelReason,
    ];
  });
  return csvResponse(`prepstack-rounds-${stamp}.csv`, header, rows);
}
