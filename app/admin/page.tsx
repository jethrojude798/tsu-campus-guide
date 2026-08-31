import { AdminDashboard } from "@/components/admin-dashboard";
import { AdminLoginForm } from "@/components/admin-login-form";
import { getAdminSessionUser } from "@/lib/auth";
import { getAdminCampusData, getAdminUsers } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getAdminSessionUser();

  if (!user) {
    return (
      <main className="adminShell">
        <section className="adminPanel adminPanelWide">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Secure admin</span>
                  <h1>Sign in to manage campus data</h1>
            </div>
            <a className="buttonSecondary" href="/">
              Back to guide
            </a>
          </div>
          <AdminLoginForm />
        </section>
      </main>
    );
  }

  const [data, admins] = await Promise.all([getAdminCampusData(), getAdminUsers()]);

  return (
    <main className="adminShell">
      <AdminDashboard user={user} data={data} admins={admins} />
    </main>
  );
}
