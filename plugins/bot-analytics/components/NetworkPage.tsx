import { getConfig, updateConfig } from "../../../src/lib/config";
import { db } from "../../../src/lib/db";
import { aeoNetworkSubmissions } from "../../../src/lib/db/schema";
import { desc } from "drizzle-orm";
import { encryptString } from "../../../src/lib/encrypt";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import RegisterButton from "../../../src/app/admin/settings/network/RegisterButton";

export default async function NetworkPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const [config, recentSubmissions] = await Promise.all([
    getConfig(),
    db
      .select()
      .from(aeoNetworkSubmissions)
      .orderBy(desc(aeoNetworkSubmissions.submittedAt))
      .limit(7),
  ]);

  const saved = searchParams.toast === "saved";
  const network = config.network ?? { participateInNetwork: false, networkToken: "" };

  async function saveNetworkSettings(formData: FormData) {
    "use server";
    const current = await getConfig();
    const participate = formData.get("participateInNetwork") === "true";
    const rawToken = (formData.get("networkToken") as string | null)?.trim() ?? "";

    await updateConfig({
      ...current,
      network: {
        ...current.network,
        participateInNetwork: participate,
        networkToken: rawToken ? encryptString(rawToken) : current.network.networkToken,
      },
    });

    revalidatePath("/admin/plugins/bot-analytics");
    redirect("/admin/plugins/bot-analytics?toast=saved");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AEO Intelligence Network</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Opt in to share anonymized bot-visit data with the AEO Pugmill Intelligence Network. Your site URL is never
          transmitted — only a one-way SHA-256 hash. Participation requires the Bot Analytics plugin to be active.
        </p>
      </div>

      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-4 py-3 text-sm">
          Network settings saved.
        </div>
      )}

      {network.participateInNetwork && (
        <div className="bg-emerald-600 rounded-lg px-4 py-3 text-sm text-white">
          Network participation is <strong>active</strong>. Reports are sent daily at 02:00 UTC.
        </div>
      )}

      <form action={saveNetworkSettings} className="bg-white border border-zinc-200 rounded-lg p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-700">Participate in the AEO Intelligence Network</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              When enabled, a daily cron job sends yesterday&apos;s bot-visit counts and content signals to aeopugmill.com.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer ml-4 shrink-0">
            <input
              type="checkbox"
              name="participateInNetworkCheckbox"
              id="participateCheck"
              defaultChecked={network.participateInNetwork}
              className="sr-only peer"
              onChange={undefined}
            />
            <input type="hidden" name="participateInNetwork" id="participateHidden" value={network.participateInNetwork ? "true" : "false"} />
            <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:bg-violet-600 transition-colors" />
            <div className="absolute left-0.5 top-0.5 bg-white border border-zinc-300 rounded-full h-5 w-5 transition-all peer-checked:translate-x-5 peer-checked:border-white" />
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Network Token</label>
          <input
            name="networkToken"
            type="text"
            autoComplete="off"
            spellCheck={false}
            // type="text" (not "password") is intentional: this is an
            // API token, not a user credential. Using type="password"
            // triggers the browser's "save this password" prompt on every
            // form submission, which is wrong UX for a non-credential
            // token. The admin is already authenticated and has
            // permission to see their own token.
            placeholder={
              network.networkToken
                ? "••••••••••••••••••••••• (leave blank to keep current)"
                : "Register below to generate a token, or paste one"
            }
            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-400"
          />
          <p className="text-xs text-zinc-400 mt-1">
            Stored encrypted at rest — never exposed to the browser.
          </p>
        </div>

        <div className="bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3 space-y-1">
          <p className="text-xs font-medium text-zinc-600">
            {network.networkToken ? "Need to refresh your token?" : "No token yet?"}
          </p>
          <p className="text-xs text-zinc-400">
            {network.networkToken
              ? "Click below to re-register this site. A new token will be issued by aeopugmill.com and auto-filled into the field above. Use this if recent submissions show HTTP 401 — that means the locally-saved token has drifted from what aeopugmill has stored. After re-registering, click Save Network Settings."
              : "Click below to register this site with aeopugmill.com. A token will be generated and filled into the field above — review it, then hit Save."}
          </p>
          <RegisterButton />
        </div>

        <button
          type="submit"
          className="bg-[var(--ds-blue-1000)] text-white px-5 py-2 rounded-full hover:bg-[var(--ds-blue-900)] text-sm"
        >
          Save Network Settings
        </button>
      </form>

      <script
        dangerouslySetInnerHTML={{
          __html: `
(function() {
  var cb = document.getElementById('participateCheck');
  var hid = document.getElementById('participateHidden');
  if (cb && hid) {
    cb.addEventListener('change', function() { hid.value = cb.checked ? 'true' : 'false'; });
  }
})();
`,
        }}
      />

      {recentSubmissions.length > 0 && (
        <section className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-100">
            <h3 className="text-sm font-semibold text-zinc-700">Recent Submissions</h3>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-5 py-2 text-left font-medium">Date</th>
                <th className="px-5 py-2 text-left font-medium">Status</th>
                <th className="px-5 py-2 text-left font-medium">HTTP</th>
                <th className="px-5 py-2 text-left font-medium">Detail</th>
                <th className="px-5 py-2 text-left font-medium">Submitted at</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {recentSubmissions.map((row) => (
                <tr key={row.id} className="hover:bg-zinc-50">
                  <td className="px-5 py-2 font-mono text-zinc-700">{row.date}</td>
                  <td className="px-5 py-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      row.status === "ok"
                        ? "bg-emerald-100 text-emerald-700"
                        : row.status === "skipped"
                        ? "bg-zinc-100 text-zinc-500"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-5 py-2 font-mono text-zinc-400">{row.responseCode ?? "—"}</td>
                  <td className="px-5 py-2 text-zinc-400 max-w-xs truncate">{row.detail ?? "—"}</td>
                  <td className="px-5 py-2 text-zinc-400">
                    {row.submittedAt.toISOString().replace("T", " ").slice(0, 16)} UTC
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="bg-zinc-50 border rounded-lg p-4 text-sm text-zinc-500 space-y-1">
        <p className="font-medium text-zinc-600">What is shared?</p>
        <ul className="list-disc ml-4 space-y-1 text-xs">
          <li>A one-way SHA-256 hash of your site URL (not the URL itself)</li>
          <li>Daily bot-visit counts by resource type (e.g. llms.txt, post markdown)</li>
          <li>Site-wide content signal distributions (word count, freshness, fact density)</li>
          <li>AEO field adoption percentages across your published posts</li>
        </ul>
        <p className="text-xs mt-2">
          No post content, URLs, user data, or personally identifiable information is ever transmitted.
        </p>
      </section>
    </div>
  );
}
