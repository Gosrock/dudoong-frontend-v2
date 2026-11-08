'use client';

import Image from '@tiptap/extension-image';
import { type Editor, EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useRef } from 'react';

import * as viewer from '@/features/shared/section-viewer/ui/SectionViewer.css';
import { Spinner } from '@/ui/components/Loader/Loader';
import { Icon } from '@/ui/icons/Icon';

import * as s from './SectionEditor.css';

const imageFile = (files: FileList | null | undefined) =>
  files ? Array.from(files).find((f) => /^image\/(png|jpe?g)$/.test(f.type)) : undefined;

/**
 * 섹션 본문 에디터(Tiptap, HTML 저장 — tech-decisions §17). GUI 에디터 카드(`1325:15322` PC · `1325:15571` 모바일, #190):
 * 테두리 카드 안 위 툴바 [B][H][목록] | [이미지] → 입력 영역. 툴바 버튼은 화면이 직접 그린 36 정사각 흰 버튼(켜짐 = 테두리,
 * `1320:426`) — FIGMA-CUSTOM: 툴바(gui 1325:15323 "툴바") 커스텀 → `SectionEditor.css.ts`. DS 후보(design-system §3).
 * 이미지는 버튼·드래그 앤 드롭·붙여 넣기로 올린다(Figma 안내 "이미지는 드래그 앤 드롭으로도 첨부 가능해요").
 * 글자 모양은 관객 뷰어(`SectionViewer`)와 같은 서식. 섹션마다 `key`로 새로 만든다(탭을 바꾸면 그 섹션 HTML로 다시 시작).
 */
export function SectionEditor({
  content,
  onChange,
  readOnly,
  uploadImage,
  uploading,
  label,
}: {
  content: string;
  onChange: (html: string) => void;
  readOnly: boolean;
  /** PE-10(SECTION) → S3 → 주소. 실패면 null(오류 문구는 훅이 낸다) */
  uploadImage: (file: File) => Promise<string | null>;
  uploading: boolean;
  /** 에디터 접근성 이름 */
  label: string;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  // 드롭·붙여 넣기 처리(editorProps)는 에디터를 만들기 전에 정해져 ref로 지금 에디터를 읽는다
  const editorRef = useRef<Editor | null>(null);
  const insert = async (editor: Editor, file: File, pos?: number) => {
    const url = await uploadImage(file);
    if (!url) return;
    const chain = editor.chain().focus();
    (pos !== undefined
      ? chain.insertContentAt(pos, { type: 'image', attrs: { src: url } })
      : chain.setImage({ src: url })
    ).run();
  };

  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: false, underline: false }),
      Image.configure({ inline: false }),
    ],
    content,
    editorProps: {
      attributes: {
        class: `${viewer.root} ${s.prose}`,
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': label,
      },
      handleDrop: (view, event) => {
        const file = imageFile(event.dataTransfer?.files);
        if (!file || readOnly || !editorRef.current) return false;
        event.preventDefault();
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        void insert(editorRef.current, file, pos);
        return true;
      },
      handlePaste: (_view, event) => {
        const file = imageFile(event.clipboardData?.files);
        if (!file || readOnly || !editorRef.current) return false;
        event.preventDefault();
        void insert(editorRef.current, file);
        return true;
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  const active = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive('bold'),
            heading: e.isActive('heading', { level: 2 }),
            list: e.isActive('bulletList'),
          }
        : { bold: false, heading: false, list: false },
  });

  return (
    <div className={s.root}>
      {!readOnly && (
        <div className={s.toolbar} role="toolbar" aria-label="본문 서식">
          <button
            type="button"
            className={s.tool}
            aria-label="굵게"
            aria-pressed={active?.bold ?? false}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <span aria-hidden className={s.toolLetter}>
              B
            </span>
          </button>
          <button
            type="button"
            className={s.tool}
            aria-label="소제목"
            aria-pressed={active?.heading ?? false}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <span aria-hidden className={s.toolLetter}>
              H
            </span>
          </button>
          <button
            type="button"
            className={s.tool}
            aria-label="목록"
            aria-pressed={active?.list ?? false}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <Icon name="list" variant="filled" className={s.toolIcon} />
          </button>
          <span aria-hidden className={s.toolDivider} />
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png"
            hidden
            aria-label="본문 이미지 올리기"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file && editor) void insert(editor, file);
            }}
          />
          <button
            type="button"
            className={s.toolWide}
            aria-busy={uploading || undefined}
            disabled={!editor || uploading}
            onClick={() => fileInput.current?.click()}
          >
            {uploading ? (
              <Spinner size="sm" />
            ) : (
              <Icon name="image" variant="filled" className={s.toolIcon} />
            )}
            이미지
          </button>
        </div>
      )}
      <EditorContent editor={editor} className={s.content} />
    </div>
  );
}
