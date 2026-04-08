"use client";

import { useState } from "react";

import type { ContentBlock } from "@/lib/types";

export function AdminContentManager({
  blocks,
}: {
  blocks: ContentBlock[];
}) {
  const [selectedId, setSelectedId] = useState(blocks[0]?.id ?? "");
  const selectedBlock = blocks.find((block) => block.id === selectedId) ?? blocks[0];

  return (
    <div className="admin-grid">
      <div className="admin-card">
        <p className="eyebrow">Oldaltartalmak</p>
        <h3>Szerkeszthető blokkok</h3>
        <div className="table-list">
          {blocks.map((block) => (
            <button
              type="button"
              key={block.id}
              className={block.id === selectedBlock?.id ? "table-row is-active" : "table-row"}
              onClick={() => setSelectedId(block.id)}
            >
              <span>
                <strong>{block.title}</strong>
                <small>{block.summary}</small>
              </span>
              <span>{block.status}</span>
            </button>
          ))}
        </div>
      </div>

      {selectedBlock ? (
        <div className="admin-card">
          <p className="eyebrow">Tartalomszerkesztő</p>
          <h3>{selectedBlock.title}</h3>
          <form className="admin-form">
            <label>
              Blokk címe
              <input defaultValue={selectedBlock.title} />
            </label>
            <label>
              Rövid leírás
              <input defaultValue={selectedBlock.summary} />
            </label>
            <label>
              Tartalom
              <textarea
                rows={9}
                defaultValue={`Ez a ${selectedBlock.title.toLowerCase()} szekció próbaszövege. Itt jelenne meg a rich text szerkesztő vagy a strukturált mezőkészlet.`}
              />
            </label>

            <div className="admin-form__actions">
              <button type="button">Publikálás</button>
              <button type="button" className="button-ghost">
                Előnézet
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
