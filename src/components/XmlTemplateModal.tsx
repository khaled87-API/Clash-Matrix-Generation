import React, { useState, useRef } from 'react';
import { UploadCloud, FileCode, X, CheckCircle, AlertCircle, Info, Layers } from 'lucide-react';
import { validateNavisworksXmlString } from '../xml/xmlValidator';

interface XmlTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplateSettings: (settings: { batchTestName: string; units: string; viewFoldersCount: number }) => void;
}

export interface ParsedTemplateInfo {
  filename: string;
  batchTestName: string;
  internalName: string;
  units: string;
  viewFolders: string[];
  selectionSetsCount: number;
  clashTestsCount: number;
}

export const XmlTemplateModal: React.FC<XmlTemplateModalProps> = ({
  isOpen,
  onClose,
  onApplyTemplateSettings,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [templateInfo, setTemplateInfo] = useState<ParsedTemplateInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const validation = validateNavisworksXmlString(text);
        if (!validation.isValid) {
          setErrorMsg(`Malformed XML: ${validation.errors.join(', ')}`);
          return;
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'application/xml');

        const batchtest = doc.querySelector('batchtest');
        const batchName = batchtest?.getAttribute('name') || 'Project11';
        const internalName = batchtest?.getAttribute('internal_name') || 'Project11';
        const units = batchtest?.getAttribute('units') || 'm';

        const viewfolders = Array.from(doc.querySelectorAll('viewfolder')).map(
          (vf) => vf.getAttribute('name') || 'Unnamed'
        );

        const selectionSetsCount = doc.querySelectorAll('selectionset').length;
        const clashTestsCount = doc.querySelectorAll('clashtest').length;

        setTemplateInfo({
          filename: file.name,
          batchTestName: batchName,
          internalName,
          units,
          viewFolders: viewfolders,
          selectionSetsCount,
          clashTestsCount,
        });
      } catch (err: any) {
        setErrorMsg(`Failed to parse XML: ${err.message || String(err)}`);
      }
    };
    reader.readAsText(file);
  };

  const handleApply = () => {
    if (templateInfo) {
      onApplyTemplateSettings({
        batchTestName: templateInfo.batchTestName,
        units: templateInfo.units,
        viewFoldersCount: templateInfo.viewFolders.length,
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#0A101D] border border-white/[0.12] rounded-2xl w-full max-w-2xl flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-white/[0.08] flex items-center justify-between bg-[#070D1B]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Navisworks XML Template Reference Mode
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Inspect and align schema with existing .xml clash test datasets
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.05] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs">
          <p className="text-slate-300 leading-relaxed">
            Upload an existing Autodesk Navisworks Clash Detective XML file (e.g. <code className="text-cyan-300 font-mono bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800">Clash_Tests_Buildings_V1.xml</code>) to inspect its structure, viewfolders, and project settings.
          </p>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/[0.15] hover:border-cyan-500/60 rounded-2xl p-7 text-center cursor-pointer bg-[#050A15]/80 hover:bg-[#070D1B] transition-all group shadow-inner"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xml"
              className="hidden"
            />
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto mb-3 text-indigo-400 group-hover:scale-105 group-hover:text-cyan-400 group-hover:border-cyan-500/40 transition-all">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="font-bold text-slate-200 text-sm">
              Click to select Navisworks XML Template (.xml)
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Supports standard Navisworks 2018–2026 BatchTest XML schemas
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-rose-950/60 border border-rose-500/40 rounded-xl text-rose-200 flex items-center shadow-sm">
              <AlertCircle className="w-4 h-4 mr-2 text-rose-400 flex-shrink-0" />
              {errorMsg}
            </div>
          )}

          {templateInfo && (
            <div className="bg-[#050A15] p-5 rounded-2xl border border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
                <span className="font-semibold text-emerald-400 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Template Analyzed: {templateInfo.filename}
                </span>
                <span className="font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800 text-[11px]">
                  Units: {templateInfo.units}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-[#070D1B] p-3 rounded-xl border border-white/[0.08]">
                  <div className="text-slate-500 text-[10px] uppercase font-mono font-bold">Batch Test Name</div>
                  <div className="font-mono text-slate-200 font-bold mt-1 text-xs truncate">
                    {templateInfo.batchTestName}
                  </div>
                </div>

                <div className="bg-[#070D1B] p-3 rounded-xl border border-white/[0.08]">
                  <div className="text-slate-500 text-[10px] uppercase font-mono font-bold">Selection Sets</div>
                  <div className="font-mono text-cyan-300 font-bold mt-1 text-sm">
                    {templateInfo.selectionSetsCount}
                  </div>
                </div>

                <div className="bg-[#070D1B] p-3 rounded-xl border border-white/[0.08]">
                  <div className="text-slate-500 text-[10px] uppercase font-mono font-bold">Clash Tests</div>
                  <div className="font-mono text-amber-300 font-bold mt-1 text-sm">
                    {templateInfo.clashTestsCount}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-slate-400 text-[11px] mb-1.5 font-semibold">
                  Detected View Folders ({templateInfo.viewFolders.length}):
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar p-1">
                  {templateInfo.viewFolders.map((f, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-[#070D1B] text-cyan-300 rounded-lg border border-white/[0.12] font-mono text-[11px]"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.08] bg-[#070D1B] flex items-center justify-end space-x-2.5 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 font-medium border border-white/10 transition-all cursor-pointer"
          >
            Cancel
          </button>
          {templateInfo && (
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all cursor-pointer border border-cyan-300/30"
            >
              Apply Project Settings from Template
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
