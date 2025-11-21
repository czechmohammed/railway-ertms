import React, { useState, useEffect, useRef } from 'react';

const RailwaySimulator = () => {
  const canvasRef = useRef(null);
  const [isRunning, setIsRunning] = useState(false);
  
  // états des trains
  const [trains, setTrains] = useState([
    { id: 1, position: 50, speed: 0, maxSpeed: 120, color: '#ef4444', name: 'Train 1', ma: 500 },
    { id: 2, position: 600, speed: 0, maxSpeed: 100, color: '#3b82f6', name: 'Train 2', ma: 1000 }
  ]);
  
  // états des cantons
  const [cantons, setCantons] = useState([
    { id: 1, start: 0, end: 300, occupied: false, signal: 'green' },
    { id: 2, start: 300, end: 600, occupied: false, signal: 'green' },
    { id: 3, start: 600, end: 900, occupied: false, signal: 'green' },
    { id: 4, start: 900, end: 1200, occupied: false, signal: 'green' }
  ]);
  
  // éléments fixes
  const [stations] = useState([
    { name: 'Gare A', position: 100 },
    { name: 'Gare B', position: 450 },
    { name: 'Gare C', position: 800 },
    { name: 'Gare D', position: 1100 }
  ]);
  
  const [balises] = useState([
    { position: 150, speedLimit: 80, type: 'Eurobalise' },
    { position: 400, speedLimit: 120, type: 'Eurobalise' },
    { position: 750, speedLimit: 60, type: 'Eurobalise' },
    { position: 1050, speedLimit: 100, type: 'Eurobalise' }
  ]);
  
  const [logs, setLogs] = useState([]);

  // fonction pour ajouter un log
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [{ timestamp, message, type }, ...prev].slice(0, 15));
  };

  // scenarios de test
  const loadScenario = (scenario) => {
    setIsRunning(false);
    setLogs([]);
    
    switch(scenario) {
      case 'collision':
        // les deux trains vont se croiser
        setTrains([
          { id: 1, position: 100, speed: 80, maxSpeed: 120, color: '#ef4444', name: 'Train 1', ma: 800 },
          { id: 2, position: 500, speed: 60, maxSpeed: 100, color: '#3b82f6', name: 'Train 2', ma: 600 }
        ]);
        addLog('scénario chargé: test collision - atp doit intervenir', 'info');
        break;
        
      case 'rattrapage':
        // train rapide rattrape le lent
        setTrains([
          { id: 1, position: 50, speed: 100, maxSpeed: 120, color: '#ef4444', name: 'Train 1', ma: 1000 },
          { id: 2, position: 400, speed: 40, maxSpeed: 60, color: '#3b82f6', name: 'Train 2', ma: 800 }
        ]);
        addLog('scénario chargé: rattrapage - train 1 doit ralentir', 'info');
        break;
        
      case 'balise':
        // train va passer sur balise 60km/h
        setTrains([
          { id: 1, position: 700, speed: 100, maxSpeed: 120, color: '#ef4444', name: 'Train 1', ma: 500 },
          { id: 2, position: 50, speed: 0, maxSpeed: 100, color: '#3b82f6', name: 'Train 2', ma: 1000 }
        ]);
        addLog('scénario chargé: balise 60km/h à position 750m', 'info');
        break;
        
      case 'ma_limit':
        // train proche de sa limite ma
        setTrains([
          { id: 1, position: 400, speed: 80, maxSpeed: 120, color: '#ef4444', name: 'Train 1', ma: 200 },
          { id: 2, position: 50, speed: 0, maxSpeed: 100, color: '#3b82f6', name: 'Train 2', ma: 1000 }
        ]);
        addLog('scénario chargé: ma limitée - train 1 doit freiner vers 600m', 'info');
        break;
        
      default:
        // reset normal
        setTrains([
          { id: 1, position: 50, speed: 0, maxSpeed: 120, color: '#ef4444', name: 'Train 1', ma: 500 },
          { id: 2, position: 600, speed: 0, maxSpeed: 100, color: '#3b82f6', name: 'Train 2', ma: 1000 }
        ]);
        addLog('configuration initiale', 'info');
    }
  };

  // boucle de simulation principale
  useEffect(() => {
    if (!isRunning) return;
    
    const interval = setInterval(() => {
      // mise à jour des trains
      setTrains(prevTrains => {
        return prevTrains.map(train => {
          let newSpeed = train.speed;
          let newPosition = train.position;

          // détection balise proche
          const nearBalise = balises.find(b => 
            Math.abs(train.position - b.position) < 5
          );
          
          if (nearBalise && Math.abs(train.position - nearBalise.position) < 1) {
            addLog(`${train.name} - balise détectée: ${nearBalise.speedLimit} km/h`, 'info');
          }

          // détection canton suivant
          const nextCanton = cantons.find(c => 
            c.start > train.position && 
            c.start < train.position + 100
          );
          
          // logique atp
          if (nextCanton && nextCanton.signal === 'red') {
            newSpeed = Math.max(0, newSpeed - 5);
            if (newSpeed === 0 && train.speed > 0) {
              addLog(`${train.name} - arrêt atp (signal rouge)`, 'warning');
            }
          } else if (nextCanton && nextCanton.signal === 'yellow') {
            newSpeed = Math.min(60, newSpeed);
            if (train.speed > 60) {
              addLog(`${train.name} - réduction vitesse atp (signal jaune)`, 'warning');
            }
          } else {
            // accélération normale
            if (newSpeed < train.maxSpeed) {
              newSpeed = Math.min(train.maxSpeed, newSpeed + 2);
            }
          }
          
          // vérification ma
          if (train.position + 50 > train.position + train.ma) {
            newSpeed = Math.max(0, newSpeed - 3);
            if (newSpeed === 0 && train.speed > 5) {
              addLog(`${train.name} - arrêt limite ma`, 'warning');
            } else if (train.speed > 10 && newSpeed < train.speed - 2) {
              addLog(`${train.name} - freinage approche limite ma`, 'warning');
            }
          }
          
          // calcul nouvelle position
          newPosition = train.position + (newSpeed / 3600) * 100;
          
          // boucle si fin de ligne
          if (newPosition > 1200) {
            newPosition = 50;
            addLog(`${train.name} - retour au départ`, 'info');
          }
          
          return { ...train, speed: newSpeed, position: newPosition };
        });
      });
      
      // mise à jour des cantons
      setCantons(prevCantons => {
        return prevCantons.map(canton => {
          const wasOccupied = canton.occupied;
          
          // vérifier occupation
          const occupied = trains.some(train => 
            train.position >= canton.start && 
            train.position < canton.end
          );
          
          // log changement occupation
          if (occupied && !wasOccupied) {
            addLog(`canton ${canton.id} occupé`, 'info');
          }
          
          // calculer signal
          const nextCanton = prevCantons.find(c => c.start === canton.end);
          let signal = 'green';
          
          if (occupied) {
            signal = 'red';
          } else if (nextCanton && nextCanton.occupied) {
            signal = 'yellow';
          }
          
          return { ...canton, occupied, signal };
        });
      });
      
    }, 100);
    
    return () => clearInterval(interval);
  }, [isRunning, trains, cantons, balises]);

  // rendu canvas (identique)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(20, height / 2);
    ctx.lineTo(width - 20, height / 2);
    ctx.stroke();

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    for (let i = 20; i < width - 20; i += 30) {
      ctx.beginPath();
      ctx.moveTo(i, height / 2 - 10);
      ctx.lineTo(i, height / 2 + 10);
      ctx.stroke();
    }

    cantons.forEach(canton => {
      const startX = 20 + (canton.start / 1200) * (width - 40);
      const endX = 20 + (canton.end / 1200) * (width - 40);
      
      ctx.fillStyle = canton.occupied ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)';
      ctx.fillRect(startX, height / 2 - 30, endX - startX, 60);

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.strokeRect(startX, height / 2 - 30, endX - startX, 60);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText(`C${canton.id}`, startX + 5, height / 2 - 35);

      const signalX = endX - 10;
      ctx.beginPath();
      ctx.arc(signalX, height / 2 - 40, 6, 0, Math.PI * 2);
      ctx.fillStyle = canton.signal === 'green' ? '#22c55e' : 
                      canton.signal === 'yellow' ? '#eab308' : '#ef4444';
      ctx.fill();
    });

    stations.forEach(station => {
      const x = 20 + (station.position / 1200) * (width - 40);
      
      ctx.fillStyle = '#8b5cf6';
      ctx.fillRect(x - 3, height / 2 - 25, 6, 50);
      
      ctx.fillStyle = '#c4b5fd';
      ctx.font = '12px sans-serif';
      ctx.save();
      ctx.translate(x, height / 2 - 30);
      ctx.rotate(-Math.PI / 4);
      ctx.fillText(station.name, 0, 0);
      ctx.restore();
    });

    balises.forEach(balise => {
      const x = 20 + (balise.position / 1200) * (width - 40);
      
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(x, height / 2 + 15);
      ctx.lineTo(x - 4, height / 2 + 25);
      ctx.lineTo(x + 4, height / 2 + 25);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#fbbf24';
      ctx.font = '9px monospace';
      ctx.fillText(`${balise.speedLimit}km/h`, x - 15, height / 2 + 35);
    });

    trains.forEach(train => {
      const x = 20 + (train.position / 1200) * (width - 40);
      
      ctx.fillStyle = train.color;
      ctx.fillRect(x - 15, height / 2 - 8, 30, 16);
      
      ctx.beginPath();
      ctx.moveTo(x + 15, height / 2 - 8);
      ctx.lineTo(x + 22, height / 2);
      ctx.lineTo(x + 15, height / 2 + 8);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(train.name, x - 12, height / 2 - 12);
      
      ctx.font = '9px monospace';
      ctx.fillText(`${Math.round(train.speed)}km/h`, x - 15, height / 2 + 25);

      const maX = 20 + (Math.min(train.position + train.ma, 1200) / 1200) * (width - 40);
      ctx.strokeStyle = train.color;
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, height / 2 + 35);
      ctx.lineTo(maX, height / 2 + 35);
      ctx.stroke();
      ctx.setLineDash([]);
    });

  }, [trains, cantons, stations, balises]);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">
            simulateur de trafic ferroviaire ertms/etcs
          </h1>
          <p className="text-slate-400">système de gestion avec rbc et atp</p>
        </div>

        {/* scenarios de test */}
        <div className="mb-6 bg-slate-800 rounded-lg p-4">
          <h3 className="font-semibold mb-3">scénarios de test</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <button
              onClick={() => loadScenario('collision')}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm transition"
            >
              test collision atp
            </button>
            <button
              onClick={() => loadScenario('rattrapage')}
              className="px-3 py-2 bg-orange-600 hover:bg-orange-700 rounded text-sm transition"
            >
              test rattrapage
            </button>
            <button
              onClick={() => loadScenario('balise')}
              className="px-3 py-2 bg-amber-600 hover:bg-amber-700 rounded text-sm transition"
            >
              test balise 60km/h
            </button>
            <button
              onClick={() => loadScenario('ma_limit')}
              className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded text-sm transition"
            >
              test limite ma
            </button>
            <button
              onClick={() => loadScenario('reset')}
              className="px-3 py-2 bg-slate-600 hover:bg-slate-700 rounded text-sm transition"
            >
              config normale
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            cliquez sur un scénario puis sur démarrer pour lancer le test
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2 bg-slate-800 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">vue de la ligne</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                >
                  {isRunning ? 'pause' : 'démarrer'}
                </button>
                <button
                  onClick={() => loadScenario('reset')}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-700 rounded-lg transition"
                >
                  reset
                </button>
              </div>
            </div>
            <canvas
              ref={canvasRef}
              width={1000}
              height={300}
              className="w-full bg-slate-900 rounded border border-slate-700"
            />
            <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500 rounded"></div>
                <span>gares</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-amber-500 rounded"></div>
                <span>eurobalises</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>signal libre</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>signal fermé</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="font-semibold mb-3">rbc - radio block center</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">statut:</span>
                  <span className="text-green-400 font-semibold">actif</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">trains surveillés:</span>
                  <span>2</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">cantons totaux:</span>
                  <span>{cantons.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">cantons occupés:</span>
                  <span className="text-amber-400">{cantons.filter(c => c.occupied).length}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="font-semibold mb-3">état des trains</h3>
              <div className="space-y-3">
                {trains.map(train => (
                  <div key={train.id} className="border border-slate-700 rounded p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded" style={{backgroundColor: train.color}}></div>
                      <span className="font-semibold">{train.name}</span>
                    </div>
                    <div className="text-xs space-y-1 text-slate-400">
                      <div>position: {Math.round(train.position)}m</div>
                      <div>vitesse: {Math.round(train.speed)} km/h</div>
                      <div>v. max: {train.maxSpeed} km/h</div>
                      <div>ma: +{train.ma}m</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-4">
          <h3 className="font-semibold mb-3">journal des événements</h3>
          <div className="bg-slate-900 rounded p-3 h-48 overflow-y-auto font-mono text-xs space-y-1">
            {logs.map((log, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-slate-500">{log.timestamp}</span>
                <span className={
                  log.type === 'warning' ? 'text-amber-400' : 
                  log.type === 'error' ? 'text-red-400' : 'text-slate-300'
                }>
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RailwaySimulator;