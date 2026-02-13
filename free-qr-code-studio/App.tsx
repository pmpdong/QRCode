
import React, { useState, useRef, useCallback } from 'react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { 
  QrCode, 
  Download, 
  Sparkles, 
  Link, 
  Type as TextIcon, 
  Mail, 
  Wifi, 
  UserCircle,
  Settings2,
  Palette,
  RefreshCw,
  Info,
  FileCode,
  Type,
  Image as ImageIcon,
  Trash2,
  Maximize,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { QRType, QRConfig, AISuggestion } from './types';
import { getAISuggestions } from './services/geminiService';

const App: React.FC = () => {
  const [activeType, setActiveType] = useState<QRType>(QRType.URL);
  const [config, setConfig] = useState<QRConfig>({
    value: 'https://free-qrcode.link',
    fgColor: '#000000',
    bgColor: '#ffffff',
    size: 512,
    level: 'H',
    includeMargin: true,
    bottomText: '',
    imageSettings: undefined
  });
  
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [iconSize, setIconSize] = useState(20);
  
  const qrRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        setConfig(prev => ({
          ...prev,
          imageSettings: {
            src,
            height: (prev.size * iconSize) / 100,
            width: (prev.size * iconSize) / 100,
            excavate: true
          }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const updateIconSize = (newSizePercent: number) => {
    setIconSize(newSizePercent);
    if (config.imageSettings) {
      setConfig(prev => ({
        ...prev,
        imageSettings: {
          ...prev.imageSettings!,
          height: (prev.size * newSizePercent) / 100,
          width: (prev.size * newSizePercent) / 100,
        }
      }));
    }
  };

  const clearIcon = () => {
    setConfig(prev => ({ ...prev, imageSettings: undefined }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownload = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (canvas) {
      const fontSize = Math.floor(canvas.width / 14);
      const verticalPadding = Math.floor(fontSize * 0.5);
      const textHeight = config.bottomText ? (fontSize + verticalPadding * 2) : 0;
      
      const finalCanvas = document.createElement('canvas');
      const ctx = finalCanvas.getContext('2d');
      if (!ctx) return;

      finalCanvas.width = canvas.width;
      finalCanvas.height = canvas.height + textHeight;

      ctx.fillStyle = config.bgColor;
      ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
      ctx.drawImage(canvas, 0, 0);

      if (config.bottomText) {
        ctx.fillStyle = config.fgColor;
        ctx.font = `bold ${fontSize}px Inter, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(config.bottomText, finalCanvas.width / 2, canvas.height + (textHeight / 2));
      }

      const url = finalCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `qrcode-${Date.now()}.png`;
      link.href = url;
      link.click();
    }
  };

  const handleSvgDownload = () => {
    const svgElement = svgRef.current?.querySelector('svg');
    if (svgElement) {
      const serializer = new XMLSerializer();
      const originalWidth = parseInt(svgElement.getAttribute('width') || '512');
      const originalHeight = parseInt(svgElement.getAttribute('height') || '512');
      const fontSize = Math.floor(originalWidth / 14);
      const verticalPadding = Math.floor(fontSize * 0.5);
      const textHeight = config.bottomText ? (fontSize + verticalPadding * 2) : 0;
      const clone = svgElement.cloneNode(true) as SVGElement;
      const newHeight = originalHeight + textHeight;

      clone.setAttribute('height', newHeight.toString());
      clone.setAttribute('viewBox', `0 0 ${originalWidth} ${newHeight}`);

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', originalWidth.toString());
      rect.setAttribute('height', newHeight.toString());
      rect.setAttribute('fill', config.bgColor);
      clone.insertBefore(rect, clone.firstChild);

      if (config.bottomText) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', (originalWidth / 2).toString());
        text.setAttribute('y', (originalHeight + (textHeight / 2)).toString());
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('fill', config.fgColor);
        text.setAttribute('style', `font-family: Inter, -apple-system, sans-serif; font-weight: bold; font-size: ${fontSize}px;`);
        text.textContent = config.bottomText;
        clone.appendChild(text);
      }

      let source = serializer.serializeToString(clone);
      if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
      }

      const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = svgUrl;
      downloadLink.download = `qrcode-${Date.now()}.svg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(svgUrl);
    }
  };

  const handleAiAsk = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    setAiError(null);
    setAiSuggestions([]);
    try {
      const suggestions = await getAISuggestions(aiPrompt);
      if (suggestions && suggestions.length > 0) {
        setAiSuggestions(suggestions);
      } else {
        setAiError("AI couldn't generate styles for that prompt. Try something more descriptive!");
      }
    } catch (err) {
      console.error(err);
      setAiError("Something went wrong. Please check your connection and try again.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const applySuggestion = (sug: AISuggestion) => {
    setConfig(prev => ({
      ...prev,
      fgColor: sug.primaryColor,
      bgColor: sug.secondaryColor
    }));
  };

  const updateValue = (val: string) => {
    setConfig(prev => ({ ...prev, value: val }));
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-900">
      <aside className="w-full md:w-96 bg-white border-r border-slate-200 overflow-y-auto p-6 flex-shrink-0 flex flex-col">
        <header className="mb-8 flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg text-white">
            <QrCode size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">FREE QR Code Studio</h1>
        </header>

        <div className="flex-grow space-y-8 pb-12">
          <section>
            <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 block">Content Type</label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { type: QRType.URL, icon: Link, label: 'Link' },
                { type: QRType.TEXT, icon: TextIcon, label: 'Text' },
                { type: QRType.EMAIL, icon: Mail, label: 'Email' },
                { type: QRType.WIFI, icon: Wifi, label: 'WiFi' },
                { type: QRType.VCARD, icon: UserCircle, label: 'Contact' },
              ].map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all border ${
                    activeType === type 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' 
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-[10px] mt-1 font-medium">{label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider block">Configuration</label>
            
            <div className="space-y-4">
              {activeType === QRType.URL && (
                <div className="space-y-2">
                  <span className="text-xs text-slate-400 font-medium">Website URL</span>
                  <input 
                    type="url" 
                    value={config.value}
                    onChange={(e) => updateValue(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-4 py-2 bg-slate-100 border-0 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              )}

              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2 mb-1">
                  <Type size={14} className="text-slate-400" />
                  <span className="text-xs text-slate-400 font-medium">Bottom Label</span>
                </div>
                <input 
                  type="text" 
                  value={config.bottomText}
                  onChange={(e) => setConfig(prev => ({ ...prev, bottomText: e.target.value }))}
                  placeholder="e.g. Scan Me"
                  className="w-full px-4 py-2 bg-slate-100 border-0 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <ImageIcon size={16} className="text-slate-400" />
                <span className="text-sm font-medium">Branding & Logo</span>
              </div>
              
              {!config.imageSettings ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer group"
                >
                  <ImageIcon size={24} className="text-slate-300 group-hover:text-indigo-400" />
                  <span className="text-xs text-slate-400 font-medium">Upload Logo</span>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleIconUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <img src={config.imageSettings.src} className="w-12 h-12 rounded-lg object-contain bg-white border border-slate-100 shadow-sm" alt="Logo" />
                    <div className="flex-grow">
                      <p className="text-xs font-bold text-slate-700 truncate max-w-[120px]">Logo Attached</p>
                      <button onClick={clearIcon} className="text-[10px] text-red-500 font-semibold hover:underline flex items-center gap-1 mt-1">
                        <Trash2 size={10} /> Remove
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-bold uppercase">Logo Size</span>
                      <span className="text-[11px] font-mono font-bold text-indigo-600">{iconSize}%</span>
                    </div>
                    <input 
                      type="range"
                      min="10"
                      max="30"
                      value={iconSize}
                      onChange={(e) => updateIconSize(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <Palette size={16} className="text-slate-400" />
                <span className="text-sm font-medium">Visual Design</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 uppercase font-bold">Foreground</span>
                  <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-100 rounded-lg">
                    <input 
                      type="color" 
                      value={config.fgColor}
                      onChange={(e) => setConfig(prev => ({ ...prev, fgColor: e.target.value }))}
                      className="w-6 h-6 border-0 bg-transparent rounded cursor-pointer"
                    />
                    <span className="text-xs font-mono uppercase">{config.fgColor}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 uppercase font-bold">Background</span>
                  <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-100 rounded-lg">
                    <input 
                      type="color" 
                      value={config.bgColor}
                      onChange={(e) => setConfig(prev => ({ ...prev, bgColor: e.target.value }))}
                      className="w-6 h-6 border-0 bg-transparent rounded cursor-pointer"
                    />
                    <span className="text-xs font-mono uppercase">{config.bgColor}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="mt-auto pt-6 border-t border-slate-100">
          <div className="bg-indigo-900 rounded-xl p-4 text-white shadow-xl shadow-indigo-200/20">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className={`${isAiLoading ? 'animate-pulse text-indigo-300' : 'text-indigo-300'}`} />
              <span className="text-sm font-semibold">AI Style Designer</span>
            </div>
            <p className="text-xs text-indigo-200 mb-4 leading-relaxed">
              Describe your brand to generate high-conversion color schemes.
            </p>
            <div className="relative">
              <input 
                type="text" 
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. 'Luxury spa in Bali'"
                className="w-full bg-indigo-800 border-0 rounded-lg py-2 pl-3 pr-10 text-sm focus:ring-1 focus:ring-indigo-400 outline-none placeholder-indigo-400"
                onKeyDown={(e) => e.key === 'Enter' && handleAiAsk()}
              />
              <button 
                onClick={handleAiAsk}
                disabled={isAiLoading || !aiPrompt}
                className="absolute right-2 top-1.5 text-indigo-300 hover:text-white disabled:opacity-50 transition-colors"
              >
                {isAiLoading ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
              </button>
            </div>
          </div>
        </section>
      </aside>

      <main className="flex-grow p-4 md:p-8 lg:p-12 flex flex-col items-center justify-center relative bg-slate-50 overflow-y-auto">
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          
          <div className="flex flex-col items-center gap-6 md:gap-8 sticky top-4 md:top-8">
            <div 
              className="p-6 md:p-10 bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl shadow-indigo-100/50 border border-slate-100 flex flex-col items-center justify-center transition-all duration-500 hover:scale-[1.01] w-full max-w-sm md:max-w-none mx-auto"
              style={{ backgroundColor: config.bgColor }}
            >
              <div ref={qrRef} className="flex items-center justify-center w-full aspect-square relative overflow-hidden">
                <QRCodeCanvas 
                  value={config.value}
                  size={config.size}
                  fgColor={config.fgColor}
                  bgColor={config.bgColor}
                  level={config.level}
                  includeMargin={config.includeMargin}
                  imageSettings={config.imageSettings}
                  className="rounded-xl w-full h-auto max-w-full"
                  style={{ width: '100%', height: 'auto' }}
                />
              </div>
              {config.bottomText && (
                <div 
                  className="mt-4 font-bold text-center w-full truncate leading-tight flex items-center justify-center px-4" 
                  style={{ 
                    color: config.fgColor, 
                    fontSize: `clamp(14px, 4vw, ${Math.max(14, config.size / 14)}px)`,
                  }}
                >
                  {config.bottomText}
                </div>
              )}
            </div>

            <div ref={svgRef} className="hidden">
              <QRCodeSVG 
                value={config.value}
                size={config.size}
                fgColor={config.fgColor}
                bgColor={config.bgColor}
                level={config.level}
                includeMargin={config.includeMargin}
                imageSettings={config.imageSettings}
              />
            </div>

            <div className="flex flex-wrap gap-4 w-full justify-center">
              <button 
                onClick={handleDownload}
                className="flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-95 text-sm md:text-base"
              >
                <Download size={20} />
                Download PNG
              </button>
              <button 
                onClick={handleSvgDownload}
                className="flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-white text-slate-700 border border-slate-200 rounded-2xl font-bold hover:bg-slate-50 transition-all active:scale-95 hover:border-indigo-300 hover:text-indigo-600 text-sm md:text-base"
              >
                <FileCode size={20} />
                SVG Vector
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Restored Google Advertisement Section */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm transition-all hover:shadow-md hidden md:block">
              <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sponsored</span>
                <span className="text-[10px] text-slate-400 flex items-center gap-1 cursor-help hover:text-slate-600">
                  Ads by Google <Info size={10} />
                </span>
              </div>
              <div className="p-4 flex flex-col items-center justify-center min-h-[250px] relative">
                <div className="w-full h-full border border-dashed border-slate-200 rounded-xl bg-slate-50 flex flex-col items-center justify-center text-center p-6 gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                    <Maximize size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-600">Dynamic Google Ad Unit</h4>
                    <p className="text-xs text-slate-400 max-w-[200px] mt-1">This slot is optimized for high-performance AdSense display content.</p>
                  </div>
                  <button className="text-[11px] font-bold text-indigo-500 flex items-center gap-1 hover:text-indigo-600 transition-colors">
                    Learn more <ExternalLink size={10} />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-6 text-indigo-600">
                <Settings2 size={24} />
                <h2 className="font-bold text-xl">Technical Props</h2>
              </div>
              
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <span className="text-sm font-bold text-slate-700 block">Error Correction</span>
                    <span className="text-[11px] text-slate-400 font-medium">Higher level allows more complex logos</span>
                  </div>
                  <div className="flex gap-1 p-1 bg-slate-100 rounded-xl self-start md:self-auto">
                    {['L', 'M', 'Q', 'H'].map(lvl => (
                      <button 
                        key={lvl}
                        onClick={() => setConfig(prev => ({ ...prev, level: lvl as any }))}
                        className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg transition-all text-sm font-black ${config.level === lvl ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-700">Export Resolution</span>
                  <select 
                    value={config.size}
                    onChange={(e) => setConfig(prev => ({ ...prev, size: Number(e.target.value) }))}
                    className="bg-slate-100 border-0 rounded-xl px-4 py-2 text-sm font-bold focus:ring-0 outline-none appearance-none cursor-pointer"
                  >
                    <option value={256}>Standard (256px)</option>
                    <option value={512}>High-Res (512px)</option>
                    <option value={1024}>Ultra (1024px)</option>
                    <option value={2048}>Print (2048px)</option>
                  </select>
                </div>
              </div>
            </div>

            {isAiLoading && (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 bg-slate-200 rounded-3xl" />
                ))}
              </div>
            )}

            {aiError && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3 text-red-600 animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                <div className="text-xs font-semibold leading-relaxed">
                  {aiError}
                </div>
              </div>
            )}

            {aiSuggestions.length > 0 && !isAiLoading && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 px-1">AI Generated Palettes</h3>
                <div className="grid gap-4">
                  {aiSuggestions.map((sug, idx) => (
                    <button
                      key={idx}
                      onClick={() => applySuggestion(sug)}
                      className="w-full text-left p-5 bg-white border border-slate-200 rounded-[1.5rem] hover:border-indigo-300 hover:shadow-lg transition-all group relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-black text-slate-800 text-lg">{sug.label}</span>
                        <div className="flex gap-2">
                          <div className="w-6 h-6 rounded-full border border-slate-100 shadow-sm" style={{ backgroundColor: sug.primaryColor }} />
                          <div className="w-6 h-6 rounded-full border border-slate-100 shadow-sm" style={{ backgroundColor: sug.secondaryColor }} />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed group-hover:text-slate-700 transition-colors pr-8">
                        {sug.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <footer className="mt-16 text-center pb-8">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-white border border-slate-200 rounded-full text-[11px] font-bold text-slate-500 shadow-sm uppercase tracking-wider">
            <Info size={16} className="text-indigo-400" />
            <span>High Error Correction (H) enables logo integration with maximum scan reliability.</span>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default App;
