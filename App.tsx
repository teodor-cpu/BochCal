
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Camera from './components/Camera';
import { analyzeFood } from './services/geminiService';
import { CalorieResult, AnalysisState, Ingredient } from './types';

const CameraIcon = () => (
  <svg className="w-8 h-8 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/><path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd"/></svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
);

const MicIcon = ({ active }: { active: boolean }) => (
  <svg className={`w-6 h-6 ${active ? 'text-red-500 animate-pulse' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
);

const App: React.FC = () => {
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState<AnalysisState>({ loading: false, result: null, error: null });
  const [showResult, setShowResult] = useState(false);
  
  const [editableIngredients, setEditableIngredients] = useState<Ingredient[]>([]);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'bg-BG';
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setNotes(prev => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const totals = useMemo(() => {
    return editableIngredients.reduce((acc, curr) => ({
      calories: acc.calories + curr.calories,
      protein: acc.protein + curr.protein,
      carbs: acc.carbs + curr.carbs,
      fat: acc.fat + curr.fat,
      weight: acc.weight + curr.weightValue
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, weight: 0 });
  }, [editableIngredients]);

  const handleAnalyze = async () => {
    const imagesToAnalyze = capturedImages.length > 0 ? capturedImages : [(window as any).captureFrame()].filter(Boolean);
    if (imagesToAnalyze.length === 0) return;
    
    setStatus({ loading: true, result: null, error: null });
    setShowResult(true);
    try {
      const result = await analyzeFood(imagesToAnalyze, notes);
      
      // Transform incoming ingredients into scalable models
      const scaledIngredients: Ingredient[] = result.ingredients.map(item => {
        const weight = Math.max(item.weightValue, 1);
        return {
          ...item,
          refCalories: item.calories / weight,
          refProtein: item.protein / weight,
          refCarbs: item.carbs / weight,
          refFat: item.fat / weight,
        };
      });

      setStatus({ loading: false, result, error: null });
      setEditableIngredients(scaledIngredients);
    } catch (err) {
      console.error(err);
      setStatus({ loading: false, result: null, error: "Грешка при анализа. Опитайте пак." });
    }
  };

  const updateWeight = (index: number, newWeight: number) => {
    setEditableIngredients(prev => {
      const next = [...prev];
      const item = next[index];
      const w = Math.max(newWeight, 0);
      
      next[index] = {
        ...item,
        weightValue: w,
        calories: Math.round(w * item.refCalories),
        protein: Math.round(w * item.refProtein * 10) / 10,
        carbs: Math.round(w * item.refCarbs * 10) / 10,
        fat: Math.round(w * item.refFat * 10) / 10,
      };
      return next;
    });
  };

  const reset = () => {
    setShowResult(false);
    setStatus({ loading: false, result: null, error: null });
    setNotes('');
    setCapturedImages([]);
    setEditableIngredients([]);
  };

  return (
    <div className="relative h-screen w-full bg-black overflow-hidden flex flex-col">
      <div className="absolute inset-0 z-0">
        <Camera isActive={!showResult} onCapture={() => {}} />
      </div>

      <div className="relative z-10 p-4 pt-12 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex justify-between items-start">
        <h1 className="text-xl font-bold text-white tracking-tight drop-shadow-lg">
          AI Калории <span className="text-green-400 font-black">Светкавица</span>
        </h1>
        {!showResult && capturedImages.length > 0 && (
          <div className="bg-green-500 text-black px-3 py-1 rounded-full font-black text-xs">
            {capturedImages.length} СНИМКИ
          </div>
        )}
      </div>

      {!showResult && (
        <div className="relative z-10 mt-auto p-6 space-y-4 bg-gradient-to-t from-black via-black/80 to-transparent pb-10">
          {capturedImages.length > 0 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {capturedImages.map((img, idx) => (
                <div key={idx} className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 border-white/20">
                  <img src={`data:image/jpeg;base64,${img}`} className="w-full h-full object-cover" />
                  <button onClick={() => setCapturedImages(p => p.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-white"><TrashIcon /></button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xl rounded-2xl p-2 border border-white/20">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Какво има в чинията?"
              className="flex-1 bg-transparent text-white px-3 py-3 outline-none placeholder:text-gray-500 text-lg"
            />
            <button onClick={() => { recognitionRef.current?.start(); setIsListening(true); }} className={`p-4 rounded-xl transition-all ${isListening ? 'bg-red-500/30' : 'hover:bg-white/10'}`}><MicIcon active={isListening} /></button>
          </div>

          <div className="flex gap-3 h-24">
            <button onClick={() => {
              const snap = (window as any).captureFrame();
              if (snap) setCapturedImages(p => [...p, snap]);
            }} className="flex-1 bg-white hover:bg-gray-200 active:scale-95 transition-all rounded-3xl flex flex-col items-center justify-center text-black font-black">
              <CameraIcon />
              <span className="text-[10px] uppercase mt-1">СНИМАЙ</span>
            </button>
            <button onClick={handleAnalyze} className="flex-[2] bg-green-500 active:scale-95 transition-all rounded-3xl flex items-center justify-center gap-2 text-black font-black text-xl shadow-2xl">
              АНАЛИЗИРАЙ
            </button>
          </div>
        </div>
      )}

      {showResult && (
        <div className="absolute inset-0 z-20 bg-black/95 backdrop-blur-3xl p-6 flex flex-col animate-in fade-in slide-in-from-bottom-10 duration-300">
          {status.loading ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-6">
              <div className="w-20 h-20 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
              <div className="text-center">
                <p className="text-green-400 font-black text-2xl animate-pulse">Анализ в реално време...</p>
                <p className="text-gray-500 text-xs mt-2 uppercase tracking-widest font-bold">Изчислявам тегло и макроси</p>
              </div>
            </div>
          ) : status.error ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-center">
              <div className="text-red-500 text-7xl">⚠️</div>
              <p className="text-xl font-bold text-white">{status.error}</p>
              <button onClick={reset} className="w-full py-4 bg-white text-black rounded-2xl font-black">ОПИТАЙ ПАК</button>
            </div>
          ) : status.result ? (
            <div className="flex-1 overflow-y-auto no-scrollbar pt-6 pb-32">
              <div className="text-center mb-8">
                <span className="text-gray-500 uppercase tracking-widest text-[10px] font-black">ОБЩО КАЛОРИИ</span>
                <h2 className="text-8xl font-black text-green-400 leading-none my-2">{Math.round(totals.calories)}</h2>
                <div className="flex justify-center gap-2">
                  <div className="bg-green-500/20 text-green-400 px-4 py-1 rounded-full text-xs font-black uppercase">kcal</div>
                  <div className="bg-blue-500/20 text-blue-400 px-4 py-1 rounded-full text-xs font-black uppercase tracking-tighter">Общо {Math.round(totals.weight)}г</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-8">
                <div className="bg-white/5 rounded-3xl p-4 text-center border border-white/10">
                  <span className="block text-blue-400 font-black text-xl leading-none mb-1">{Math.round(totals.protein * 10) / 10}g</span>
                  <span className="text-[10px] text-gray-500 uppercase font-black">Протеин</span>
                </div>
                <div className="bg-white/5 rounded-3xl p-4 text-center border border-white/10">
                  <span className="block text-yellow-400 font-black text-xl leading-none mb-1">{Math.round(totals.carbs * 10) / 10}g</span>
                  <span className="text-[10px] text-gray-500 uppercase font-black">Въглех.</span>
                </div>
                <div className="bg-white/5 rounded-3xl p-4 text-center border border-white/10">
                  <span className="block text-red-400 font-black text-xl leading-none mb-1">{Math.round(totals.fat * 10) / 10}g</span>
                  <span className="text-[10px] text-gray-500 uppercase font-black">Мазнини</span>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">СЪСТАВКИ И ТЕГЛО</h3>
                {editableIngredients.map((item, idx) => (
                  <div key={idx} className="bg-white/5 p-5 rounded-3xl border border-white/10 flex items-center gap-4">
                    <div className="flex-1">
                      <p className="font-black text-white text-lg leading-tight mb-1">{item.name}</p>
                      <div className="flex gap-3">
                        <span className="text-[10px] text-blue-400/70 font-bold uppercase">P: {item.protein}g</span>
                        <span className="text-[10px] text-yellow-400/70 font-bold uppercase">C: {item.carbs}g</span>
                        <span className="text-[10px] text-red-400/70 font-bold uppercase">F: {item.fat}g</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                       <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 border border-white/5">
                          <input
                            type="number"
                            value={item.weightValue}
                            onChange={(e) => updateWeight(idx, Number(e.target.value))}
                            className="bg-transparent text-white font-black text-lg outline-none w-16 text-right"
                          />
                          <span className="text-gray-500 font-black text-xs">г</span>
                       </div>
                       <p className="font-black text-green-400 text-sm">{Math.round(item.calories)} kcal</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-5 bg-green-500/10 border border-green-500/20 rounded-3xl">
                <p className="text-xs text-green-300 leading-relaxed italic opacity-80">
                  "{status.result.explanation}"
                </p>
              </div>
            </div>
          ) : null}

          {!status.loading && (
            <div className="absolute bottom-10 left-6 right-6">
              <button
                onClick={reset}
                className="w-full py-5 bg-white text-black rounded-3xl font-black text-xl active:scale-95 transition-transform shadow-2xl"
              >
                НОВА СНИМКА
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
