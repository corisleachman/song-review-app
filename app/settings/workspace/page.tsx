'use client';

import { useRef, useState } from 'react';
import { useSettingsData, useSettingsActions } from '@/lib/settingsContext';
import styles from '../settings.module.css';

export default function WorkspacePage() {
  const { isOwner, workspaceName, workspaceImageUrl, notificationMode, loading } = useSettingsData();
  const { setWorkspaceName, setWorkspaceImageUrl, setNotificationMode } = useSettingsActions();

  const [nameDraft, setNameDraft] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameNotice, setNameNotice] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const [imageUploading, setImageUploading] = useState(false);
  const [imageNotice, setImageNotice] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [notifSaving, setNotifSaving] = useState(false);
  const [notifNotice, setNotifNotice] = useState<string | null>(null);
  const [notifError, setNotifError] = useState<string | null>(null);

  const currentName = workspaceName || 'Your workspace';

  // Initialise draft once data loads
  const [draftInit, setDraftInit] = useState(false);
  if (!loading && !draftInit) {
    setNameDraft(workspaceName || '');
    setDraftInit(true);
  }

  const handleSaveName = async () => {
    const next = nameDraft.trim();
    setNameError(null);
    setNameNotice(null);
    if (!next) { setNameError('Name is required.'); return; }
    setNameSaving(true);
    try {
      const res = await fetch('/api/workspace/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: next }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || 'Could not update workspace name.');
      const saved = payload?.workspace?.name ?? next;
      setWorkspaceName(saved);
      setNameDraft(saved);
      setNameNotice('Workspace name updated.');
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Could not update workspace name.');
    } finally {
      setNameSaving(false);
    }
  };

  const handleImageSelected = async (file: File | null | undefined) => {
    if (!file) return;
    setImageError(null);
    setImageNotice(null);
    if (!file.type.startsWith('image/')) { setImageError('Must be an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setImageError('Image must be 5 MB or smaller.'); return; }
    setImageUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/workspace/settings', { method: 'POST', body: form });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || 'Could not upload image.');
      setWorkspaceImageUrl(payload?.workspace?.imageUrl ?? null);
      setImageNotice('Workspace image updated.');
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Could not upload image.');
    } finally {
      setImageUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleNotifMode = async (mode: 'all_members' | 'owner_only') => {
    setNotifError(null);
    setNotifNotice(null);
    setNotifSaving(true);
    try {
      const res = await fetch('/api/workspace/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_mode: mode }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error || 'Could not save notification setting.');
      }
      setNotificationMode(mode);
      setNotifNotice('Notification setting saved.');
    } catch (err) {
      setNotifError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setNotifSaving(false);
    }
  };

  if (loading) return <div className={styles.sectionLoading}>Loading…</div>;

  return (
    <div className={styles.sectionContainer}>
      <div className={styles.sectionHeading}>
        <h2>Workspace</h2>
        <p>Settings for <strong>{currentName}</strong>. Changes apply to all members.</p>
      </div>

      {/* ── Name ── */}
      <div className={styles.settingsBlock}>
        <div className={styles.blockLabel}>
          <h3>Workspace name</h3>
          <p>{isOwner ? 'Visible to all members in the workspace switcher.' : 'Only the workspace owner can rename this workspace.'}</p>
        </div>
        {isOwner ? (
          <div className={styles.blockControl}>
            <div className={styles.inlineForm}>
              <input
                type="text"
                value={nameDraft}
                onChange={e => { setNameDraft(e.target.value); setNameError(null); setNameNotice(null); }}
                className={styles.textInput}
                placeholder="Rebel HQ"
                maxLength={80}
                disabled={nameSaving}
              />
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => void handleSaveName()}
                disabled={nameSaving || !nameDraft.trim() || nameDraft.trim() === currentName}
              >
                {nameSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
            {nameError && <p className={styles.blockError}>{nameError}</p>}
            {nameNotice && <p className={styles.blockNotice}>{nameNotice}</p>}
          </div>
        ) : (
          <div className={styles.blockReadOnly}>{currentName}</div>
        )}
      </div>

      {/* ── Image ── */}
      <div className={styles.settingsBlock}>
        <div className={styles.blockLabel}>
          <h3>Workspace image</h3>
          <p>{isOwner ? 'Shown in the workspace switcher. Max 5 MB.' : 'Only the workspace owner can update this.'}</p>
        </div>
        <div className={styles.blockControl}>
          <div className={styles.imageRow}>
            <div className={styles.imagePreview}>
              {workspaceImageUrl
                ? <img src={workspaceImageUrl} alt="" />
                : <span>{currentName.trim()[0]?.toUpperCase() ?? 'W'}</span>}
            </div>
            {isOwner && (
              <>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className={styles.hiddenFileInput}
                  onChange={e => void handleImageSelected(e.target.files?.[0])}
                />
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => imageInputRef.current?.click()}
                  disabled={imageUploading}
                >
                  {imageUploading ? 'Uploading…' : workspaceImageUrl ? 'Change image' : 'Upload image'}
                </button>
              </>
            )}
          </div>
          {imageError && <p className={styles.blockError}>{imageError}</p>}
          {imageNotice && <p className={styles.blockNotice}>{imageNotice}</p>}
        </div>
      </div>

      {/* ── Notifications ── */}
      <div className={styles.settingsBlock}>
        <div className={styles.blockLabel}>
          <h3>Comment notifications</h3>
          <p>{isOwner ? 'How email notifications work when comments are posted.' : 'Controlled by the workspace owner.'}</p>
        </div>
        <div className={styles.blockControl}>
          {isOwner ? (
            <div className={styles.notifOptions}>
              <button
                type="button"
                className={`${styles.notifOption} ${notificationMode === 'all_members' ? styles.notifOptionActive : ''}`}
                onClick={() => void handleNotifMode('all_members')}
                disabled={notifSaving}
              >
                <span className={styles.notifOptionLabel}>Notify everyone</span>
                <span className={styles.notifOptionDesc}>Every member receives an email whenever anyone posts a comment.</span>
              </button>
              <button
                type="button"
                className={`${styles.notifOption} ${notificationMode === 'owner_only' ? styles.notifOptionActive : ''}`}
                onClick={() => void handleNotifMode('owner_only')}
                disabled={notifSaving}
              >
                <span className={styles.notifOptionLabel}>Owner as hub</span>
                <span className={styles.notifOptionDesc}>Members’ comments notify only the owner. Owner replies notify all members.</span>
              </button>
              {notifError && <p className={styles.blockError}>{notifError}</p>}
              {notifNotice && <p className={styles.blockNotice}>{notifNotice}</p>}
            </div>
          ) : (
            <div className={styles.blockReadOnly}>
              {notificationMode === 'owner_only'
                ? 'Owner-managed. Member comments go to the owner; owner replies go to all members.'
                : 'All members receive emails when a comment is posted.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
