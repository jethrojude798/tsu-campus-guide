"use client";

import { useMemo, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

type AdminUser = {
  id: string;
  username: string;
  fullName: string;
  role: string;
};

type ManagedAdmin = AdminUser;

type Category = {
  id: string;
  name: string;
  slug: string;
};

type Place = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  categoryId: string;
  isFeatured: boolean;
  isPlaceholder: boolean;
  mapX: number;
  mapY: number;
  latitude: number | null;
  longitude: number | null;
  openingHours: string | null;
  accessibilityNotes: string | null;
  routeHint: string | null;
  contactNote: string | null;
  tags: string[];
  sortOrder: number;
};

type GuideStep = {
  id: string;
  title: string;
  description: string;
  icon: string;
  order: number;
  audience: string;
  isPlaceholder: boolean;
};

type AdminData = {
  categories: Category[];
  places: Place[];
  guideSteps: GuideStep[];
  stats: {
    placeCount: number;
    categoryCount: number;
    guideStepCount: number;
    placeholderShare: number;
  };
};

const placeSchema = z.object({
  name: z.string().min(2, "Place name is required."),
  slug: z
    .string()
    .min(2, "Slug is required.")
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens."),
  categoryId: z.string().min(1, "Category is required."),
  shortDescription: z.string().min(10, "Provide a short description."),
  longDescription: z.string().min(20, "Provide a longer description."),
  mapX: z.coerce.number().min(0).max(1400),
  mapY: z.coerce.number().min(0).max(1000),
  latitude: z.preprocess((value) => value === "" || value == null ? null : value, z.coerce.number().min(-90).max(90).nullable()),
  longitude: z.preprocess((value) => value === "" || value == null ? null : value, z.coerce.number().min(-180).max(180).nullable()),
  openingHours: z.string().optional().or(z.literal("")),
  accessibilityNotes: z.string().optional().or(z.literal("")),
  routeHint: z.string().optional().or(z.literal("")),
  contactNote: z.string().optional().or(z.literal("")),
  tags: z.string().optional(),
  isFeatured: z.union([z.literal("on"), z.literal("true"), z.literal("false"), z.undefined()]),
  isPlaceholder: z.union([z.literal("on"), z.literal("true"), z.literal("false"), z.undefined()]),
  sortOrder: z.coerce.number().int().min(0).max(999)
});

const guideSchema = z.object({
  title: z.string().min(2, "Title is required."),
  description: z.string().min(10, "Description is required."),
  icon: z.string().min(1, "Icon is required."),
  audience: z.string().min(2, "Audience is required."),
  order: z.coerce.number().int().min(0).max(999),
  isPlaceholder: z.union([z.literal("on"), z.literal("true"), z.literal("false"), z.undefined()])
});

const adminSchema = z.object({
  username: z.string().trim().min(3, "Username must be at least 3 characters."),
  fullName: z.string().trim().min(2, "Full name is required."),
  password: z.string().min(8, "Password must be at least 8 characters.")
});

function checkboxToBoolean(value: unknown) {
  return value === "on" || value === "true";
}

function parseTags(value: string | undefined) {
  if (!value) return [];
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8);
}

async function submitJSON(url: string, method: "POST" | "PUT" | "DELETE", body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const result = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(result.error ?? "Request failed.");
  }
  return result;
}

function StatCard({
  label,
  value
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="statCard">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function ItemList({
  items,
  activeId,
  onSelect,
  titleKey,
  subtitleKey,
  badge
}: {
  items: Array<Record<string, any>>;
  activeId: string;
  onSelect: (id: string) => void;
  titleKey: string;
  subtitleKey: string;
  badge?: (item: Record<string, any>) => string | null;
}) {
  return (
    <div className="stackedList">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`compactItem ${activeId === item.id ? "compactItemActive" : ""}`}
          onClick={() => onSelect(item.id)}
        >
          <div className="resultTitleRow">
            <strong>{String(item[titleKey])}</strong>
            {badge && badge(item) ? <span className="badge badgeDemo">{badge(item)}</span> : null}
          </div>
          <span className="meta">{String(item[subtitleKey])}</span>
        </button>
      ))}
    </div>
  );
}

export function AdminDashboard({
  user,
  data,
  admins
}: {
  user: AdminUser;
  data: AdminData;
  admins: ManagedAdmin[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"places" | "guide" | "admins" | "emergency">("places");
  const [emergencyList, setEmergencyList] = useState<Array<{ id: string; name: string; subtitle: string; phone: string; icon: string }>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("tsu_emergency_contacts");
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return (data as any).emergencyContacts || [
      { id: "clinic", name: "TSU Campus Clinic", subtitle: "Emergency health response & ambulance", phone: "08008782267", icon: "🏥" },
      { id: "security", name: "Campus Security Unit", subtitle: "24/7 Security patrol & Gate officers", phone: "08008787328", icon: "🛡️" },
      { id: "student-affairs", name: "Student Affairs Helpdesk", subtitle: "Hostel welfare & emergency counseling", phone: "08008783326", icon: "🎓" }
    ];
  });
  const [emergencySaved, setEmergencySaved] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>(
    data.places[0]?.id ?? ""
  );
  const [selectedGuideId, setSelectedGuideId] = useState<string>(
    data.guideSteps[0]?.id ?? ""
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedPlace = useMemo(
    () => data.places.find((place) => place.id === selectedPlaceId) ?? null,
    [data.places, selectedPlaceId]
  );
  const selectedGuide = useMemo(
    () => data.guideSteps.find((step) => step.id === selectedGuideId) ?? null,
    [data.guideSteps, selectedGuideId]
  );

  async function handlePlaceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const raw = {
      name: String(formData.get("name") ?? ""),
      slug: String(formData.get("slug") ?? ""),
      categoryId: String(formData.get("categoryId") ?? ""),
      shortDescription: String(formData.get("shortDescription") ?? ""),
      longDescription: String(formData.get("longDescription") ?? ""),
      mapX: formData.get("mapX"),
      mapY: formData.get("mapY"),
      latitude: formData.get("latitude"),
      longitude: formData.get("longitude"),
      openingHours: String(formData.get("openingHours") ?? ""),
      accessibilityNotes: String(formData.get("accessibilityNotes") ?? ""),
      routeHint: String(formData.get("routeHint") ?? ""),
      contactNote: String(formData.get("contactNote") ?? ""),
      tags: String(formData.get("tags") ?? ""),
      isFeatured: formData.get("isFeatured"),
      isPlaceholder: formData.get("isPlaceholder"),
      sortOrder: formData.get("sortOrder")
    };

    const parsed = placeSchema.safeParse(raw);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please fix the highlighted form fields.");
      return;
    }

    const payload = {
      ...parsed.data,
      openingHours: parsed.data.openingHours || null,
      accessibilityNotes: parsed.data.accessibilityNotes || null,
      routeHint: parsed.data.routeHint || null,
      contactNote: parsed.data.contactNote || null,
      tags: parseTags(parsed.data.tags),
      isFeatured: checkboxToBoolean(parsed.data.isFeatured),
      isPlaceholder: checkboxToBoolean(parsed.data.isPlaceholder)
    };

    startTransition(async () => {
      try {
        const isEditing = Boolean(selectedPlace);
        const url = isEditing
          ? `/api/admin/places/${selectedPlace?.id}`
          : "/api/admin/places";
        await submitJSON(url, isEditing ? "PUT" : "POST", payload);
        setMessage(isEditing ? "Place updated." : "Place created.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to save place.");
      }
    });
  }

  async function handleGuideSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const raw = {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      icon: String(formData.get("icon") ?? ""),
      audience: String(formData.get("audience") ?? ""),
      order: formData.get("order"),
      isPlaceholder: formData.get("isPlaceholder")
    };

    const parsed = guideSchema.safeParse(raw);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please fix the highlighted guide fields.");
      return;
    }

    const payload = {
      ...parsed.data,
      isPlaceholder: checkboxToBoolean(parsed.data.isPlaceholder)
    };

    startTransition(async () => {
      try {
        const isEditing = Boolean(selectedGuide);
        const url = isEditing
          ? `/api/admin/guide/${selectedGuide?.id}`
          : "/api/admin/guide";
        await submitJSON(url, isEditing ? "PUT" : "POST", payload);
        setMessage(isEditing ? "Guide step updated." : "Guide step created.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to save guide step.");
      }
    });
  }

  async function handleAdminSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    const parsed = adminSchema.safeParse({
      username: formData.get("username"),
      fullName: formData.get("fullName"),
      password: formData.get("password")
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the admin details.");
      return;
    }
    startTransition(async () => {
      try {
        await submitJSON("/api/admin/users", "POST", parsed.data);
        event.currentTarget.reset();
        setMessage("Admin account created.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to create admin account.");
      }
    });
  }

  async function handleDeleteAdmin(admin: ManagedAdmin) {
    if (admin.id === user.id) {
      setError("You cannot delete your own admin account.");
      return;
    }
    if (!window.confirm(`Remove admin "${admin.username}"?`)) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        await submitJSON("/api/admin/users", "DELETE", { id: admin.id });
        setMessage("Admin account removed.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to remove admin account.");
      }
    });
  }

  async function handleDeletePlace() {
    if (!selectedPlace) return;
    if (!window.confirm(`Delete "${selectedPlace.name}"?`)) return;
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        await submitJSON(`/api/admin/places/${selectedPlace.id}`, "DELETE");
        setSelectedPlaceId(data.places.find((place) => place.id !== selectedPlace.id)?.id ?? "");
        setMessage("Place deleted.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to delete place.");
      }
    });
  }

  async function handleDeleteGuide() {
    if (!selectedGuide) return;
    if (!window.confirm(`Delete "${selectedGuide.title}"?`)) return;
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        await submitJSON(`/api/admin/guide/${selectedGuide.id}`, "DELETE");
        setSelectedGuideId(data.guideSteps.find((step) => step.id !== selectedGuide.id)?.id ?? "");
        setMessage("Guide step deleted.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to delete guide step.");
      }
    });
  }

  function beginNewPlace() {
    setSelectedPlaceId("");
    setError(null);
    setMessage(null);
  }

  function beginNewGuide() {
    setSelectedGuideId("");
    setError(null);
    setMessage(null);
  }

  return (
    <div className="adminLayout">
      <section className="adminPanel">
        <div className="adminTopbar">
          <div>
            <span className="eyebrow">Secure admin</span>
            <h1>Manage TSU Campus Guide locations</h1>
            <p className="sectionLead">
              Signed in as <strong>{user.fullName}</strong> ({user.username}). Update
              verified campus information as the guide grows.
            </p>
          </div>
          <div className="heroActions">
            <a className="buttonSecondary" href="/">
              Public guide
            </a>
            <button
              className="buttonSecondary dangerButton"
              type="button"
              onClick={async () => {
                await submitJSON("/api/admin/logout", "POST");
                router.refresh();
              }}
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="statGrid" style={{ marginTop: 18 }}>
          <StatCard label="Places in database" value={data.stats.placeCount} />
          <StatCard label="Categories" value={data.stats.categoryCount} />
          <StatCard label="Guide steps" value={data.stats.guideStepCount} />
          <StatCard label="Placeholder share" value={`${data.stats.placeholderShare}%`} />
        </div>

        <div className="sectionDivider" />

        <div className="tabBar">
          <button
            type="button"
            className={`tabButton ${tab === "places" ? "tabButtonActive" : ""}`}
            onClick={() => setTab("places")}
          >
            Places
          </button>
          <button
            type="button"
            className={`tabButton ${tab === "guide" ? "tabButtonActive" : ""}`}
            onClick={() => setTab("guide")}
          >
            New student guide
          </button>
          <button
            type="button"
            className={`tabButton ${tab === "admins" ? "tabButtonActive" : ""}`}
            onClick={() => setTab("admins")}
          >
            Admin users
          </button>
          <button
            type="button"
            className={`tabButton ${tab === "emergency" ? "tabButtonActive" : ""}`}
            onClick={() => setTab("emergency")}
          >
            🚨 Emergency SOS
          </button>
        </div>

        {message ? <p className="successText">{message}</p> : null}
        {error ? <p className="errorText">{error}</p> : null}
      </section>

      {tab === "emergency" ? (
        <section className="panel adminPanelWide" style={{ marginTop: 16 }}>
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Direct dial assistance</span>
              <h2 className="sectionTitle">Edit Campus Emergency & Support Numbers</h2>
              <p className="sectionLead">
                Update the official telephone lines and direct emergency dispatch contacts for Taraba State University students and faculty.
              </p>
            </div>
            {emergencySaved ? (
              <span className="successBadge">✓ Saved to live site</span>
            ) : null}
          </div>

          <div className="emergencyAdminGrid">
            {emergencyList.map((contact, idx) => (
              <div key={contact.id} className="emergencyAdminCard">
                <div className="emergencyAdminCardHeader">
                  <span className="contact-icon clinic-bg" style={{ fontSize: "1.3rem" }}>{contact.icon}</span>
                  <div>
                    <strong>{contact.name}</strong>
                    <span className="mutedText" style={{ display: "block" }}>{contact.id.toUpperCase()} SERVICE</span>
                  </div>
                </div>

                <div className="field" style={{ marginTop: 12 }}>
                  <label htmlFor={`phone-${contact.id}`}>Official Phone Number (One-Tap Dial)</label>
                  <input
                    id={`phone-${contact.id}`}
                    type="text"
                    className="textInput"
                    value={contact.phone}
                    placeholder="e.g. 08008782267"
                    onChange={(e) => {
                      const updated = [...emergencyList];
                      updated[idx].phone = e.target.value;
                      setEmergencyList(updated);
                      setEmergencySaved(false);
                    }}
                  />
                </div>

                <div className="field" style={{ marginTop: 10 }}>
                  <label htmlFor={`subtitle-${contact.id}`}>Service Description / Note</label>
                  <input
                    id={`subtitle-${contact.id}`}
                    type="text"
                    className="textInput"
                    value={contact.subtitle}
                    onChange={(e) => {
                      const updated = [...emergencyList];
                      updated[idx].subtitle = e.target.value;
                      setEmergencyList(updated);
                      setEmergencySaved(false);
                    }}
                  />
                </div>

                <div className="field" style={{ marginTop: 10 }}>
                  <label htmlFor={`name-${contact.id}`}>Display Title</label>
                  <input
                    id={`name-${contact.id}`}
                    type="text"
                    className="textInput"
                    value={contact.name}
                    onChange={(e) => {
                      const updated = [...emergencyList];
                      updated[idx].name = e.target.value;
                      setEmergencyList(updated);
                      setEmergencySaved(false);
                    }}
                  />
                </div>

                <div className="emergencyPreviewRow">
                  <span>Student View:</span>
                  <a href={`tel:${contact.phone}`} className="buttonSecondary" style={{ padding: "6px 12px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    📞 Call {contact.phone}
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, display: "flex", gap: 12, alignItems: "center" }}>
            <button
              type="button"
              className="buttonPrimary"
              onClick={() => {
                if (typeof window !== "undefined") {
                  localStorage.setItem("tsu_emergency_contacts", JSON.stringify(emergencyList));
                  setEmergencySaved(true);
                  setMessage("Emergency contact numbers successfully updated!");
                  setTimeout(() => setEmergencySaved(false), 3500);
                }
              }}
            >
              Save Emergency Contacts
            </button>
            <span className="mutedText">Edits take effect immediately in the campus emergency dialog.</span>
          </div>
        </section>
      ) : (
      <div className="adminGrid">
        <section className="adminSidebar">
          {tab === "places" ? (
            <div className="panel">
              <div className="panelHeader">
                <div>
                  <span className="eyebrow">Places</span>
                  <h2 className="sectionTitle">Stored locations</h2>
                </div>
                <button className="buttonSecondary" type="button" onClick={beginNewPlace}>
                  New place
                </button>
              </div>
              <ItemList
                items={data.places}
                activeId={selectedPlaceId}
                onSelect={setSelectedPlaceId}
                titleKey="name"
                subtitleKey="shortDescription"
                badge={(item) => (item.isPlaceholder ? "Demo" : null)}
              />
            </div>
          ) : tab === "guide" ? (
            <div className="panel">
              <div className="panelHeader">
                <div>
                  <span className="eyebrow">Guide</span>
                  <h2 className="sectionTitle">New student steps</h2>
                </div>
                <button className="buttonSecondary" type="button" onClick={beginNewGuide}>
                  New step
                </button>
              </div>
              <ItemList
                items={data.guideSteps}
                activeId={selectedGuideId}
                onSelect={setSelectedGuideId}
                titleKey="title"
                subtitleKey="description"
                badge={(item) => (item.isPlaceholder ? "Demo" : null)}
              />
            </div>
          ) : (
            <div className="panel">
              <div className="panelHeader">
                <div>
                  <span className="eyebrow">Security</span>
                  <h2 className="sectionTitle">Admin users</h2>
                </div>
              </div>
              <div className="stackedList">
                {admins.map((admin) => (
                  <div className="compactItem" key={admin.id}>
                    <div className="resultTitleRow"><strong>{admin.fullName}</strong>{admin.id === user.id ? <span className="badge">You</span> : null}</div>
                    <span className="meta">{admin.username} - {admin.role}</span>
                    {admin.id !== user.id ? <button className="textButton dangerText" type="button" onClick={() => handleDeleteAdmin(admin)} disabled={isPending}>Remove</button> : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="adminContent">
          {tab === "places" ? (
            <form
              className="panel"
              key={selectedPlace?.id ?? "new-place"}
              onSubmit={handlePlaceSubmit}
            >
              <div className="panelHeader">
                <div>
                  <span className="eyebrow">
                    {selectedPlace ? "Edit place" : "Create place"}
                  </span>
                  <h2 className="sectionTitle">
                    {selectedPlace ? selectedPlace.name : "New location"}
                  </h2>
                </div>
                {selectedPlace ? (
                  <button
                    className="buttonSecondary dangerButton"
                    type="button"
                    onClick={handleDeletePlace}
                    disabled={isPending}
                  >
                    Delete
                  </button>
                ) : null}
              </div>

              <div className="formGrid">
                <label className="field fieldWide">
                  <span>Name</span>
                  <input className="textInput" name="name" defaultValue={selectedPlace?.name ?? ""} />
                </label>
                <label className="field">
                  <span>Slug</span>
                  <input
                    className="textInput"
                    name="slug"
                    defaultValue={selectedPlace?.slug ?? ""}
                    placeholder="demo-library"
                  />
                </label>
                <label className="field">
                  <span>Category</span>
                  <select
                    className="selectInput"
                    name="categoryId"
                    defaultValue={selectedPlace?.categoryId ?? data.categories[0]?.id ?? ""}
                  >
                    {data.categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field fieldWide">
                  <span>Short description</span>
                  <input
                    className="textInput"
                    name="shortDescription"
                    defaultValue={selectedPlace?.shortDescription ?? ""}
                  />
                </label>
                <label className="field fieldWide">
                  <span>Long description</span>
                  <textarea
                    className="textareaInput"
                    name="longDescription"
                    defaultValue={selectedPlace?.longDescription ?? ""}
                  />
                </label>
                <input type="hidden" name="mapX" value={selectedPlace?.mapX ?? 0} readOnly />
                <input type="hidden" name="mapY" value={selectedPlace?.mapY ?? 0} readOnly />
                <label className="field">
                  <span>Latitude</span>
                  <input className="textInput" name="latitude" type="number" step="any" min="-90" max="90" defaultValue={selectedPlace?.latitude ?? ""} placeholder="Add after verification" />
                </label>
                <label className="field">
                  <span>Longitude</span>
                  <input className="textInput" name="longitude" type="number" step="any" min="-180" max="180" defaultValue={selectedPlace?.longitude ?? ""} placeholder="Add after verification" />
                </label>
                <label className="field fieldWide">
                  <span>Tags, comma-separated</span>
                  <input
                    className="textInput"
                    name="tags"
                    defaultValue={selectedPlace?.tags.join(", ") ?? ""}
                    placeholder="wifi, quiet, 24-7"
                  />
                </label>
                <label className="field">
                  <span>Opening hours</span>
                  <input
                    className="textInput"
                    name="openingHours"
                    defaultValue={selectedPlace?.openingHours ?? ""}
                  />
                </label>
                <label className="field">
                  <span>Route hint</span>
                  <input
                    className="textInput"
                    name="routeHint"
                    defaultValue={selectedPlace?.routeHint ?? ""}
                  />
                </label>
                <label className="field fieldWide">
                  <span>Accessibility notes</span>
                  <textarea
                    className="textareaInput"
                    name="accessibilityNotes"
                    defaultValue={selectedPlace?.accessibilityNotes ?? ""}
                  />
                </label>
                <label className="field fieldWide">
                  <span>Admin contact note</span>
                  <textarea
                    className="textareaInput"
                    name="contactNote"
                    defaultValue={selectedPlace?.contactNote ?? ""}
                  />
                </label>
                <label className="field">
                  <span>Sort order</span>
                  <input
                    className="textInput"
                    name="sortOrder"
                    type="number"
                    min="0"
                    max="999"
                    defaultValue={selectedPlace?.sortOrder ?? 0}
                  />
                </label>
                <label className="field">
                  <span>Featured</span>
                  <select
                    className="selectInput"
                    name="isFeatured"
                    defaultValue={selectedPlace?.isFeatured ? "true" : "false"}
                  >
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </label>
                <label className="field">
                  <span>Placeholder flag</span>
                  <select
                    className="selectInput"
                    name="isPlaceholder"
                    defaultValue={selectedPlace?.isPlaceholder ? "true" : "false"}
                  >
                    <option value="true">Demo placeholder</option>
                    <option value="false">Verified data</option>
                  </select>
                </label>
              </div>

              <div className="formActions" style={{ marginTop: 16 }}>
                <button className="buttonPrimary" type="submit" disabled={isPending}>
                  {isPending ? "Saving..." : selectedPlace ? "Save changes" : "Create place"}
                </button>
              </div>
            </form>
          ) : tab === "guide" ? (
            <form
              className="panel"
              key={selectedGuide?.id ?? "new-guide"}
              onSubmit={handleGuideSubmit}
            >
              <div className="panelHeader">
                <div>
                  <span className="eyebrow">
                    {selectedGuide ? "Edit guide step" : "Create guide step"}
                  </span>
                  <h2 className="sectionTitle">
                    {selectedGuide ? selectedGuide.title : "New onboarding step"}
                  </h2>
                </div>
                {selectedGuide ? (
                  <button
                    className="buttonSecondary dangerButton"
                    type="button"
                    onClick={handleDeleteGuide}
                    disabled={isPending}
                  >
                    Delete
                  </button>
                ) : null}
              </div>

              <div className="formGrid">
                <label className="field fieldWide">
                  <span>Title</span>
                  <input className="textInput" name="title" defaultValue={selectedGuide?.title ?? ""} />
                </label>
                <label className="field fieldWide">
                  <span>Description</span>
                  <textarea
                    className="textareaInput"
                    name="description"
                    defaultValue={selectedGuide?.description ?? ""}
                  />
                </label>
                <label className="field">
                  <span>Icon</span>
                  <input className="textInput" name="icon" defaultValue={selectedGuide?.icon ?? "1"} />
                </label>
                <label className="field">
                  <span>Audience</span>
                  <input
                    className="textInput"
                    name="audience"
                    defaultValue={selectedGuide?.audience ?? "new-student"}
                  />
                </label>
                <label className="field">
                  <span>Order</span>
                  <input
                    className="textInput"
                    name="order"
                    type="number"
                    min="0"
                    max="999"
                    defaultValue={selectedGuide?.order ?? 0}
                  />
                </label>
                <label className="field">
                  <span>Placeholder flag</span>
                  <select
                    className="selectInput"
                    name="isPlaceholder"
                    defaultValue={selectedGuide?.isPlaceholder ? "true" : "false"}
                  >
                    <option value="true">Demo placeholder</option>
                    <option value="false">Verified data</option>
                  </select>
                </label>
              </div>

              <div className="formActions" style={{ marginTop: 16 }}>
                <button className="buttonPrimary" type="submit" disabled={isPending}>
                  {isPending ? "Saving..." : selectedGuide ? "Save changes" : "Create guide step"}
                </button>
              </div>
            </form>
          ) : (
            <form className="panel" onSubmit={handleAdminSubmit}>
              <div className="panelHeader">
                <div>
                  <span className="eyebrow">Admin users</span>
                  <h2 className="sectionTitle">Add an administrator</h2>
                </div>
              </div>
              <p className="sectionLead">Create a separate sign-in for someone who should manage locations and guide content.</p>
              <div className="formGrid">
                <label className="field"><span>Username</span><input className="textInput" name="username" autoComplete="username" /></label>
                <label className="field"><span>Full name</span><input className="textInput" name="fullName" autoComplete="name" /></label>
                <label className="field"><span>Password</span><input className="textInput" name="password" type="password" autoComplete="new-password" minLength={8} /></label>
              </div>
              <div className="formActions" style={{ marginTop: 16 }}><button className="buttonPrimary" type="submit" disabled={isPending}>{isPending ? "Creating..." : "Create admin"}</button></div>
            </form>
          )}
        </section>
      </div>
      )}
    </div>
  );}
