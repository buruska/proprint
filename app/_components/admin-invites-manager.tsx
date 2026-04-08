"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  ADMIN_PERMISSION_OPTIONS,
  type AdminPermission,
} from "@/lib/admin-permissions";

import styles from "./admin-invites-manager.module.css";

type FormFeedback = {
  type: "success" | "error";
  message: string;
} | null;

type AdminListItem = {
  id: string;
  name: string;
  email: string;
  roleLabel: string | null;
  isProtected: boolean;
  permissions: string[];
  canDelete: boolean;
};

type AdminInvitesManagerProps = {
  admins: AdminListItem[];
  currentAdminId: string;
};

const ALL_PERMISSIONS = ADMIN_PERMISSION_OPTIONS.map((option) => option.value);

export function AdminInvitesManager({
  admins,
  currentAdminId,
}: AdminInvitesManagerProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [adminPendingDelete, setAdminPendingDelete] = useState<AdminListItem | null>(null);
  const [email, setEmail] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<AdminPermission[]>(ALL_PERMISSIONS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingAdminId, setDeletingAdminId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FormFeedback>(null);

  const selectedCountLabel = useMemo(() => {
    if (selectedPermissions.length === ALL_PERMISSIONS.length) {
      return "Minden admin menüpont engedélyezve";
    }

    return `${selectedPermissions.length} admin menüpont engedélyezve`;
  }, [selectedPermissions]);

  const isDeleteModalOpen = adminPendingDelete !== null;
  const isAnyModalOpen = isModalOpen || isDeleteModalOpen;

  useEffect(() => {
    if (!isAnyModalOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (isDeleteModalOpen) {
        if (!deletingAdminId) {
          setAdminPendingDelete(null);
        }
        return;
      }

      if (!isSubmitting) {
        setIsModalOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [deletingAdminId, isAnyModalOpen, isDeleteModalOpen, isSubmitting]);

  function resetForm() {
    setEmail("");
    setSelectedPermissions(ALL_PERMISSIONS);
  }

  function openModal() {
    resetForm();
    setFeedback(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSubmitting) {
      return;
    }

    setIsModalOpen(false);
  }

  function closeDeleteModal() {
    if (deletingAdminId) {
      return;
    }

    setAdminPendingDelete(null);
  }

  function togglePermission(permission: AdminPermission) {
    setSelectedPermissions((current) =>
      current.includes(permission)
        ? current.filter((value) => value !== permission)
        : [...current, permission],
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/admin/admins/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          permissions: selectedPermissions,
        }),
      });

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "A meghívó kiküldése nem sikerült.");
      }

      setFeedback({
        type: "success",
        message: result.message || "A meghívó email sikeresen elküldve.",
      });
      setIsModalOpen(false);
      resetForm();
      router.refresh();
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "A meghívó kiküldése nem sikerült.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function requestDeleteAdmin(admin: AdminListItem) {
    if (!admin.canDelete || deletingAdminId) {
      return;
    }

    setFeedback(null);
    setAdminPendingDelete(admin);
  }

  async function confirmDeleteAdmin() {
    if (!adminPendingDelete || deletingAdminId) {
      return;
    }

    setDeletingAdminId(adminPendingDelete.id);
    setFeedback(null);

    try {
      const response = await fetch(`/api/admin/admins/${adminPendingDelete.id}`, {
        method: "DELETE",
      });

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "Az admin törlése nem sikerült.");
      }

      setFeedback({
        type: "success",
        message: result.message || "Az admin felhasználó törölve lett.",
      });
      setAdminPendingDelete(null);
      router.refresh();
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Az admin törlése nem sikerült.",
      });
    } finally {
      setDeletingAdminId(null);
    }
  }

  return (
    <div className={styles.stack}>
      <section className="admin-card">
        <div className={styles.heroHeader}>
          <div>
            <p className="eyebrow">Admin meghívók</p>
            <h3>Új admin meghívása</h3>
            <p>
              Küldj ki egy 24 óráig érvényes regisztrációs linket, és jelöld ki,
              hogy a superadmin kivételével mely admin menük jelenjenek meg az új
              fióknál.
            </p>
          </div>

          <button type="button" onClick={openModal} className={styles.inviteButton}>
            Admin meghívó küldése
          </button>
        </div>

        <div className={styles.permissionPreview}>
          {ADMIN_PERMISSION_OPTIONS.map((option) => (
            <span key={option.value} className={styles.permissionChip}>
              {option.label}
            </span>
          ))}
        </div>

        {feedback ? (
          <p className={`${styles.feedback} ${styles[feedback.type]}`}>{feedback.message}</p>
        ) : null}
      </section>

      <section className="admin-card">
        <div className={styles.listHeader}>
          <div>
            <p className="eyebrow">Aktív adminok</p>
            <h3>Jelenlegi admin felhasználók</h3>
            <p>
              Itt látható az összes jelenleg aktív admin fiók a kijelölt admin
              menükkel és hozzáférésekkel együtt.
            </p>
          </div>
          <p className={styles.adminCount}>{admins.length} admin</p>
        </div>

        {admins.length > 0 ? (
          <div className={styles.adminList}>
            {admins.map((admin) => {
              const isDeleting = deletingAdminId === admin.id;
              const isCurrentAdmin = admin.id === currentAdminId;

              return (
                <article key={admin.id} className={styles.adminRow}>
                  <div className={styles.adminMain}>
                    <div className={styles.adminHeading}>
                      <h4 className={styles.adminName}>{admin.name}</h4>
                      <div className={styles.badges}>
                        {admin.roleLabel ? (
                          <span className={styles.roleBadge}>{admin.roleLabel}</span>
                        ) : null}
                        {admin.isProtected ? (
                          <span className={styles.protectedBadge}>Védett</span>
                        ) : null}
                        {isCurrentAdmin ? (
                          <span className={styles.currentBadge}>Te</span>
                        ) : null}
                      </div>
                    </div>

                    <p className={styles.adminEmail}>{admin.email}</p>
                  </div>

                  <div className={styles.adminPermissions}>
                    <span className={styles.permissionsLabel}>Engedélyezett admin menük</span>
                    <div className={styles.permissionsWrap}>
                      {admin.roleLabel === "Szuperadmin" ? (
                        <span className={styles.permissionPillStrong}>Teljes hozzáférés</span>
                      ) : admin.permissions.length > 0 ? (
                        admin.permissions.map((permission) => (
                          <span key={`${admin.id}-${permission}`} className={styles.permissionPill}>
                            {permission}
                          </span>
                        ))
                      ) : (
                        <span className={styles.permissionPillMuted}>Csak a Saját adatok menü érhető el</span>
                      )}
                    </div>
                  </div>

                  <div className={styles.adminActions}>
                    {admin.canDelete ? (
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => requestDeleteAdmin(admin)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? "Törlés..." : "Törlés"}
                      </button>
                    ) : (
                      <span className={styles.deleteHint}>
                        {admin.isProtected
                          ? "A védett admin nem törölhető"
                          : isCurrentAdmin
                            ? "A saját fiók nem törölhető"
                            : "Ez az admin nem törölhető"}
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className={styles.emptyState}>Jelenleg nincs aktív admin felhasználó.</p>
        )}
      </section>

      {isDeleteModalOpen ? (
        <div className={styles.modalBackdrop} onClick={closeDeleteModal}>
          <div
            className={`${styles.modalPanel} ${styles.confirmModalPanel}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-delete-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <p className="eyebrow">Admin törlése</p>
                <h3 id="admin-delete-title">Biztosan törölni szeretnéd?</h3>
                <p className={styles.confirmText}>
                  A(z) <strong>{adminPendingDelete?.email}</strong> admin fiók törlése nem visszavonható.
                </p>
              </div>

              <button
                type="button"
                className={styles.closeButton}
                onClick={closeDeleteModal}
                disabled={Boolean(deletingAdminId)}
              >
                Bezárás
              </button>
            </div>

            <div className={styles.confirmMeta}>
              <span className={styles.confirmLabel}>Törlendő admin</span>
              <strong>{adminPendingDelete?.name}</strong>
            </div>

            <div className={styles.actionRow}>
              <button
                type="button"
                className="button-secondary"
                onClick={closeDeleteModal}
                disabled={Boolean(deletingAdminId)}
              >
                Mégsem
              </button>
              <button
                type="button"
                className="button-primary"
                onClick={confirmDeleteAdmin}
                disabled={Boolean(deletingAdminId)}
              >
                {deletingAdminId ? "Törlés..." : "Admin törlése"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isModalOpen ? (
        <div className={styles.modalBackdrop} onClick={closeModal}>
          <div
            className={styles.modalPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-invite-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <p className="eyebrow">Új meghívó</p>
                <h3 id="admin-invite-title">Admin meghívó küldése</h3>
                <p>
                  Add meg az email címet, majd válaszd ki, mely admin menük
                  jelenjenek meg ennél a fióknál.
                </p>
              </div>

              <button type="button" className={styles.closeButton} onClick={closeModal}>
                Bezárás
              </button>
            </div>

            <form className="admin-form" onSubmit={handleSubmit}>
              <label>
                Email cím
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  placeholder="pelda@proprintkiado.hu"
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>

              <fieldset className={styles.permissionFieldset}>
                <legend>Engedélyezett admin menük</legend>
                <p className={styles.selectionSummary}>{selectedCountLabel}</p>

                <div className={styles.permissionGrid}>
                  {ADMIN_PERMISSION_OPTIONS.map((option) => {
                    const isChecked = selectedPermissions.includes(option.value);

                    return (
                      <label
                        key={option.value}
                        className={isChecked ? styles.permissionOptionActive : styles.permissionOption}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePermission(option.value)}
                        />
                        <span>{option.label}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className={styles.actionRow}>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={closeModal}
                  disabled={isSubmitting}
                >
                  Mégsem
                </button>
                <button
                  type="submit"
                  className="button-primary"
                  disabled={isSubmitting || selectedPermissions.length === 0}
                >
                  {isSubmitting ? "Meghívó küldése..." : "Meghívó küldése"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
