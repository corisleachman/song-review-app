'use client';

import { type RefObject, useEffect, useRef } from 'react';
import { formatTimestamp } from '@/lib/auth';
import styles from './version.module.css';

interface Comment {
  id: string;
  author: string;
  author_user_id?: string | null;
  author_avatar_url?: string | null;
  body: string;
  created_at: string;
  delivery_status?: 'sending';
}

interface Thread {
  id: string;
  timestamp_seconds: number;
  created_by: string;
  created_at: string;
  comments: Comment[];
}

interface CommentLinkedAction {
  comment_id: string | null;
}

interface VersionCommentsPanelProps {
  panelRef: RefObject<HTMLDivElement>;
  isCompact: boolean;
  isOpen: boolean;
  threads: Thread[];
  selectedThreadId: string | null;
  nearbyThreadId: string | null;
  pendingTimestamp: number | null;
  currentTime: number;
  currentUserId: string | null;
  identity: string;
  actions: CommentLinkedAction[];
  animatedCommentId: string | null;
  newComment: string;
  replyText: string;
  posting: boolean;
  commentError: string | null;
  replyError: string | null;
  threadLinkCopied: boolean;
  timestampCopied: boolean;
  onClose: () => void;
  onStartComment: () => void;
  onUseCurrentTime: () => void;
  onChangeNewComment: (value: string) => void;
  onSubmitThread: () => void;
  onCancelNewComment: () => void;
  onSelectThread: (thread: Thread) => void;
  onShowThreadIndex: () => void;
  onReplyNearby: () => void;
  onStartSeparateComment: () => void;
  onChangeReply: (value: string) => void;
  onSubmitReply: (threadId: string) => void;
  onCopyThreadTimestamp: (timestampSeconds: number) => void;
  onCopyThreadLink: (threadId: string) => void;
  onMarkAsAction: (commentId: string, body: string) => void;
}

const MARKER_COLORS = ['#C0392B', '#4ecdc4', '#45b7d1', '#D4C4B0', '#98d8c8', '#f7dc6f', '#8C7B6B'];

function getInitials(name: string | null | undefined) {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatThreadPreview(text?: string) {
  const normalized = (text ?? '').trim().replace(/\s+/g, ' ');
  if (!normalized) return 'Open conversation';
  return normalized.length > 84 ? `${normalized.slice(0, 81)}…` : normalized;
}

export default function VersionCommentsPanel({
  panelRef,
  isCompact,
  isOpen,
  threads,
  selectedThreadId,
  nearbyThreadId,
  pendingTimestamp,
  currentTime,
  currentUserId,
  identity,
  actions,
  animatedCommentId,
  newComment,
  replyText,
  posting,
  commentError,
  replyError,
  threadLinkCopied,
  timestampCopied,
  onClose,
  onStartComment,
  onUseCurrentTime,
  onChangeNewComment,
  onSubmitThread,
  onCancelNewComment,
  onSelectThread,
  onShowThreadIndex,
  onReplyNearby,
  onStartSeparateComment,
  onChangeReply,
  onSubmitReply,
  onCopyThreadTimestamp,
  onCopyThreadLink,
  onMarkAsAction,
}: VersionCommentsPanelProps) {
  const newCommentRef = useRef<HTMLTextAreaElement>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);
  const addCommentButtonRef = useRef<HTMLButtonElement>(null);
  const selectedThread = threads.find(thread => thread.id === selectedThreadId) ?? null;
  const nearbyThread = threads.find(thread => thread.id === nearbyThreadId) ?? null;
  const showNewCommentComposer = pendingTimestamp !== null && nearbyThreadId === null;

  useEffect(() => {
    if ((isCompact && !isOpen) || !showNewCommentComposer) return;
    const frame = window.requestAnimationFrame(() => newCommentRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [isCompact, isOpen, showNewCommentComposer]);

  const replyToNearbyThread = () => {
    onReplyNearby();
    window.requestAnimationFrame(() => replyInputRef.current?.focus());
  };

  const cancelNewComment = () => {
    onCancelNewComment();
    window.requestAnimationFrame(() => addCommentButtonRef.current?.focus());
  };

  return (
    <div
      ref={panelRef}
      className={`${styles.commentsSurface} ${isOpen ? styles.commentsSurfaceOpen : ''}`}
      role={isCompact ? 'dialog' : 'complementary'}
      aria-modal={isCompact ? true : undefined}
      aria-labelledby="version-comments-title"
      tabIndex={-1}
    >
      <header className={styles.commentsSurfaceHeader}>
        <div className={styles.commentsTitleGroup}>
          <span className={styles.commentsEyebrow}>REVIEW NOTES</span>
          <h2 id="version-comments-title" className={styles.commentsTitle}>
            Comments <span>{threads.length}</span>
          </h2>
        </div>
        <div className={styles.commentsHeaderActions}>
          <button
            ref={addCommentButtonRef}
            type="button"
            className={styles.addCommentBtn}
            onClick={onStartComment}
            disabled={posting}
          >
            + Add at {formatTimestamp(Math.floor(currentTime))}
          </button>
          <button
            type="button"
            className={styles.commentsCloseBtn}
            onClick={onClose}
            aria-label="Close comments"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      {pendingTimestamp !== null && nearbyThread && selectedThread?.id === nearbyThread.id && (
        <div className={styles.nearbyThreadNotice}>
          <div>
            <strong>A comment already exists at {formatTimestamp(nearbyThread.timestamp_seconds)}</strong>
            <span>Reply there to keep one conversation together, or start a separate note.</span>
          </div>
          <div className={styles.nearbyThreadActions}>
            <button type="button" className={styles.postBtn} onClick={replyToNearbyThread}>Reply in thread</button>
            <button type="button" className={styles.cancelBtn} onClick={onStartSeparateComment}>Start separate comment</button>
            <button type="button" className={styles.textBtn} onClick={cancelNewComment}>Cancel</button>
          </div>
        </div>
      )}

      {showNewCommentComposer && (
        <section className={styles.newCommentComposer} aria-label={`New comment at ${formatTimestamp(pendingTimestamp)}`}>
          <div className={styles.composerHeading}>
            <div>
              <span className={styles.composerLabel}>NEW TIMESTAMPED COMMENT</span>
              <strong>@ {formatTimestamp(Math.floor(pendingTimestamp))}</strong>
            </div>
            <button type="button" className={styles.textBtn} onClick={onUseCurrentTime}>
              Use current time ({formatTimestamp(Math.floor(currentTime))})
            </button>
          </div>
          <label className={styles.composerField}>
            <span className={styles.srOnly}>Comment</span>
            <textarea
              ref={newCommentRef}
              className={styles.commentTextarea}
              placeholder="What should everyone listen for here?"
              value={newComment}
              onChange={event => onChangeNewComment(event.target.value)}
              rows={4}
              maxLength={4000}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  onSubmitThread();
                }
              }}
              disabled={posting}
              aria-describedby={commentError ? 'new-comment-error' : undefined}
            />
          </label>
          {commentError && <p id="new-comment-error" className={styles.commentError} role="alert">{commentError}</p>}
          <div className={styles.composerActions}>
            <span className={styles.composerHint}>Enter posts · Shift+Enter adds a new line</span>
            <button type="button" className={styles.cancelBtn} onClick={cancelNewComment} disabled={posting}>Cancel</button>
            <button type="button" className={styles.postBtn} onClick={onSubmitThread} disabled={!newComment.trim() || posting}>
              {posting ? 'Posting…' : 'Post comment'}
            </button>
          </div>
        </section>
      )}

      {!showNewCommentComposer && selectedThread ? (
        <>
          <div className={styles.threadsPanelHeader}>
            <div className={styles.threadHeaderInfo} tabIndex={-1}>
              <div
                className={styles.threadMarkerDot}
                style={{ background: MARKER_COLORS[Math.max(0, threads.findIndex(thread => thread.id === selectedThread.id)) % MARKER_COLORS.length] }}
              />
              <div className={styles.threadHeaderMeta}>
                <span className={styles.threadTimestamp}>@ {formatTimestamp(selectedThread.timestamp_seconds)}</span>
                <span className={styles.threadHeaderCount}>
                  {selectedThread.comments.length} message{selectedThread.comments.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <div className={styles.threadHeaderActions}>
              <button type="button" className={styles.threadActionBtn} onClick={() => onSelectThread(selectedThread)}>Jump to time</button>
              <button type="button" className={styles.threadActionBtn} onClick={() => onCopyThreadTimestamp(selectedThread.timestamp_seconds)}>
                {timestampCopied ? 'Copied time' : 'Copy timestamp'}
              </button>
              <button type="button" className={styles.threadActionBtn} onClick={() => onCopyThreadLink(selectedThread.id)}>
                {threadLinkCopied ? 'Copied link' : 'Copy link'}
              </button>
            </div>
            <button type="button" className={styles.threadsDropdown} onClick={onShowThreadIndex}>
              All comments ▾
            </button>
          </div>

          <div className={styles.bubbleList}>
            {selectedThread.comments.map((comment, index, allComments) => {
              const isOwn = comment.author_user_id && currentUserId
                ? comment.author_user_id === currentUserId
                : comment.author === identity;
              const previous = allComments[index - 1];
              const previousKey = previous ? previous.author_user_id || previous.author : null;
              const currentKey = comment.author_user_id || comment.author;
              const showMeta = previousKey !== currentKey;

              return (
                <div key={comment.id} className={`${styles.bubbleRow} ${isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther}`}>
                  {showMeta ? (
                    <div className={styles.bubbleAvatar}>
                      <span className={styles.bubbleAvatarInitials}>{getInitials(comment.author)}</span>
                      {comment.author_avatar_url && (
                        <img
                          src={comment.author_avatar_url}
                          alt=""
                          referrerPolicy="no-referrer"
                          onError={event => { event.currentTarget.style.display = 'none'; }}
                        />
                      )}
                    </div>
                  ) : (
                    <div className={`${styles.bubbleAvatar} ${styles.bubbleAvatarSpacer}`} aria-hidden="true" />
                  )}
                  <div className={styles.bubbleStack}>
                    {showMeta && <span className={styles.bubbleAuthor}>{isOwn ? 'You' : comment.author}</span>}
                    <div className={`${styles.bubble} ${isOwn ? styles.bubbleOwn : styles.bubbleOther} ${animatedCommentId === comment.id ? styles.bubbleGentlePop : ''}`}>
                      {comment.body}
                    </div>
                    {comment.delivery_status === 'sending' && (
                      <span className={styles.bubbleDelivery} role="status">Sending…</span>
                    )}
                    {comment.delivery_status !== 'sending' && !actions.some(action => action.comment_id === comment.id) && (
                      <button type="button" className={styles.markActionBtn} onClick={() => onMarkAsAction(comment.id, comment.body)}>
                        + Mark as action
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.replyRow}>
            <label className={styles.replyField}>
              <span className={styles.srOnly}>Reply to this thread</span>
              <input
                ref={replyInputRef}
                className={styles.replyInput}
                placeholder="Reply to this thread…"
                value={replyText}
                onChange={event => onChangeReply(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') onSubmitReply(selectedThread.id);
                }}
                disabled={posting}
                aria-describedby={replyError ? 'reply-comment-error' : undefined}
              />
            </label>
            <span className={styles.replyTime}>{posting ? 'Posting…' : `Playhead ${formatTimestamp(Math.floor(currentTime))}`}</span>
            <button type="button" className={styles.replyBtn} aria-label="Post reply" onClick={() => onSubmitReply(selectedThread.id)} disabled={!replyText.trim() || posting}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M1 7h11M8 3l4 4-4 4" />
              </svg>
            </button>
            {replyError && <p id="reply-comment-error" className={styles.commentError} role="alert">{replyError}</p>}
          </div>
        </>
      ) : !showNewCommentComposer ? (
        <div className={styles.threadIndexView}>
          {threads.length === 0 ? (
            <div className={styles.commentsEmpty}>
              <span className={styles.commentsEmptyMark}>00:00</span>
              <h3>No comments yet</h3>
              <p>Move the playhead, then add a note when there is something everyone should hear.</p>
              <button type="button" className={styles.postBtn} onClick={onStartComment}>Add the first comment</button>
            </div>
          ) : (
            <div className={styles.threadIndexList}>
              {threads.map((thread, index) => (
                <button
                  key={thread.id}
                  type="button"
                  className={styles.threadIndexItem}
                  onClick={() => onSelectThread(thread)}
                  aria-label={`Open comment at ${formatTimestamp(thread.timestamp_seconds)}, ${thread.comments.length} message${thread.comments.length === 1 ? '' : 's'}`}
                >
                  <div className={styles.threadIndexDot} style={{ background: MARKER_COLORS[index % MARKER_COLORS.length] }} />
                  <div className={styles.threadIndexBody}>
                    <div className={styles.threadIndexTop}>
                      <span className={styles.threadIndexTime}>@ {formatTimestamp(thread.timestamp_seconds)}</span>
                      <span className={styles.threadIndexCount}>
                        {thread.comments.length} message{thread.comments.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <span className={styles.threadIndexPreview}>{formatThreadPreview(thread.comments[0]?.body)}</span>
                    <span className={styles.threadIndexMeta}>
                      Last reply by {thread.comments[thread.comments.length - 1]?.author || thread.created_by}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
