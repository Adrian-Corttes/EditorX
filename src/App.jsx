import React, { useState, useCallback, useEffect, useRef } from 'react';
import { File, Files, GitBranch, Search, X } from 'lucide-react';

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const BlinkingCursorStyle = () => (
  <style>{`
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }
    .blinking-cursor {
      font-weight: bold;
      animation: blink 1s step-end infinite;
      color: white;
    }
    .editor-area:focus {
      outline: none;
    }
  `}</style>
);

const ActivityBarIcon = ({ icon: Icon, title }) => (
  <div className="relative group cursor-pointer">
    <Icon className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
    <div className="absolute left-full ml-3 px-2 py-1 bg-black text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
      {title}
    </div>
  </div>
);

const ActivityBar = () => (
  <div className="w-12 h-full bg-[#333333] flex flex-col items-center py-4 space-y-6">
    <ActivityBarIcon icon={Files} title="Explorador" />
    <ActivityBarIcon icon={Search} title="Buscar" />
    <ActivityBarIcon icon={GitBranch} title="Control de código fuente" />
  </div>
);

const FileExplorer = ({ openedFiles, currentFileIndex, setCurrentFileIndex }) => (
  <div className="w-64 h-full bg-[#252526] overflow-y-auto">
    <div className="p-2.5 text-xs text-gray-400 font-bold uppercase">Explorador</div>
    {openedFiles.length > 0 ? (
      openedFiles.map((file, index) => (
        <div
          key={index}
          className={`px-4 py-1 text-sm text-gray-300 flex items-center cursor-pointer rounded 
          ${currentFileIndex === index ? 'bg-gray-700/50' : 'hover:bg-gray-700/30'}`}
          onClick={() => setCurrentFileIndex(index)}
        >
          <File className="w-4 h-4 mr-2 text-blue-400" />
          <span>{file.name}</span>
        </div>
      ))
    ) : (
      <div className="px-4 py-2 text-sm text-gray-500">
        No hay ninguna carpeta abierta.
      </div>
    )}
  </div>
);

const SearchBar = ({ searchQuery, setSearchQuery, searchResultsCount }) => (
  <div className="bg-[#252526] p-1 flex items-center border-b border-t border-gray-700 z-20 relative">
    <Search className="w-4 h-4 text-gray-400 mr-3 ml-1" />
    <input
      type="text"
      placeholder="Buscar en el archivo..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="bg-transparent text-white placeholder-gray-400 text-sm focus:outline-none w-full"
    />
    {searchQuery && (
      <span className="text-gray-400 text-xs px-2 whitespace-nowrap">
        {searchResultsCount} {searchResultsCount === 1 ? 'resultado' : 'resultados'}
      </span>
    )}
  </div>
);

const Notification = ({ message, type, onDismiss }) => {
  if (!message) return null;

  const baseStyle = "fixed top-5 right-5 p-4 rounded-md shadow-lg text-white flex items-center z-50 transition-opacity duration-300";
  const typeStyles = {
    error: "bg-red-600",
    success: "bg-green-600",
  };

  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className={`${baseStyle} ${typeStyles[type] || 'bg-gray-800'}`}>
      <span>{message}</span>
      <X className="w-5 h-5 ml-4 cursor-pointer" onClick={onDismiss} />
    </div>
  );
};

const getLetterStartIndex = (line) => {
  const parts = line.split(';');
  if (parts.length > 3) {
    return parts.slice(0, 3).join(';').length + 1;
  }
  return 0;
};

const Editor = ({ openedFiles, currentFileIndex, setOpenedFiles, setCurrentFileIndex, setNotification }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [hoveredPosition, setHoveredPosition] = useState(null);
  const [cursorPosition, setCursorPosition] = useState({ line: 0, char: 0 });
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const editorRef = useRef(null);

  const currentFile = openedFiles[currentFileIndex];

  const updateContentAndHistory = (newContent, addToHistory = true) => {
    const newFiles = [...openedFiles];
    newFiles[currentFileIndex] = { ...currentFile, content: newContent };
    setOpenedFiles(newFiles);

    if (addToHistory && history[historyIndex] !== newContent) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newContent);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  };

  useEffect(() => {
    if (!searchQuery || !currentFile) {
      setSearchResults([]);
      return;
    }

    try {
      const safeSearchQuery = escapeRegExp(searchQuery);
      const regex = new RegExp(safeSearchQuery, 'gi');
      const lines = currentFile.content.split('\n');
      const results = [];
      lines.forEach((line, lineIndex) => {
        let match;
        while ((match = regex.exec(line)) !== null) {
          if (match[0].length === 0) {
            regex.lastIndex++;
            continue;
          }
          results.push({
            line: lineIndex,
            start: match.index,
            end: match.index + match[0].length,
          });
        }
      });
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    }
  }, [searchQuery, currentFile]);

  const isHighlighted = (lineIndex, charIndex) => {
    if (searchQuery.length === 0) return false;
    return searchResults.some(result =>
      result.line === lineIndex && charIndex >= result.start && charIndex < result.end
    );
  };

  const handleKeyDown = (e) => {
    if (!currentFile) return;

    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      const blob = new Blob([currentFile.content], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = currentFile.name;
      link.click();
      setNotification({ message: "Archivo guardado correctamente.", type: "success" });
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        updateContentAndHistory(history[newIndex], false);
      }
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        updateContentAndHistory(history[newIndex], false);
      }
      return;
    }

    if (!cursorPosition || currentFile.content === null) return;

    const lines = currentFile.content.split('\n');
    let { line, char } = cursorPosition;

    if (!['Meta', 'Control', 'Alt', 'Shift'].includes(e.key)) {
      e.preventDefault();
    }

    let contentChanged = false;

    switch (e.key) {
      case 'ArrowUp': if (line > 0) { line--; char = Math.min(char, lines[line].length); } break;
      case 'ArrowDown': if (line < lines.length - 1) { line++; char = Math.min(char, lines[line].length); } break;
      case 'ArrowLeft': if (char > 0) { char--; } else if (line > 0) { line--; char = lines[line].length; } break;
      case 'ArrowRight': if (char < lines[line].length) { char++; } else if (line < lines.length - 1) { line++; char = 0; } break;
      case 'Home': char = 0; break;
      case 'End': char = lines[line].length; break;
      case 'Backspace':
        if (char > 0) {
          lines[line] = lines[line].slice(0, char - 1) + lines[line].slice(char);
          char--;
        } else if (line > 0) {
          char = lines[line - 1].length;
          lines[line - 1] += lines[line];
          lines.splice(line, 1);
          line--;
        }
        contentChanged = true;
        break;
      case 'Enter':
        const after = lines[line].slice(char);
        lines[line] = lines[line].slice(0, char);
        lines.splice(line + 1, 0, after);
        line++; char = 0;
        contentChanged = true;
        break;
      default:
        if (e.key.length === 1) {
          lines[line] = lines[line].slice(0, char) + e.key + lines[line].slice(char);
          char++;
          contentChanged = true;
        }
    }

    if (contentChanged) updateContentAndHistory(lines.join('\n'));
    setCursorPosition({ line, char });
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        if (file.type.startsWith("text/") || file.type === "") {
          const reader = new FileReader();
          reader.onload = (event) => {
            const newContent = event.target.result;
            setOpenedFiles(prev => {
              const updated = [...prev, { name: file.name, content: newContent }];
              localStorage.setItem('myEditorOpenedFiles', JSON.stringify(updated));
              localStorage.setItem('myEditorCurrentFileIndex', updated.length - 1);
              return updated;
            });
            setCurrentFileIndex(openedFiles.length);

            // ✅ Inicializa historial
            setHistory([newContent]);
            setHistoryIndex(0);
          };
          reader.readAsText(file);
        } else {
          setNotification({ message: "Error: Solo archivos de texto.", type: 'error' });
        }
      });
    }
  }, [setOpenedFiles, setNotification, setCurrentFileIndex, openedFiles.length]);

  const handleClose = () => {
    if (openedFiles.length === 0) return;
    const newFiles = openedFiles.filter((_, i) => i !== currentFileIndex);
    setOpenedFiles(newFiles);
    if (newFiles.length === 0) {
      setCurrentFileIndex(0);
    } else {
      setCurrentFileIndex(Math.max(0, currentFileIndex - 1));
    }
  };

  return (
    <div
      className="flex-1 h-full bg-[#1E1E1E] flex flex-col"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={() => setIsDragging(true)}
      onDragLeave={() => setIsDragging(false)}
    >
      <BlinkingCursorStyle />
      {currentFile && (
        <>
          <div className="flex bg-[#252526]">
            <div className="flex items-center px-4 py-2 bg-[#1E1E1E] text-gray-300 text-sm border-t-2 border-blue-500">
              <File className="w-4 h-4 mr-2 text-blue-400" />
              <span>{currentFile.name}</span>
              <X className="w-4 h-4 ml-4 cursor-pointer hover:bg-gray-600 rounded" onClick={handleClose} />
            </div>
          </div>
          <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} searchResultsCount={searchResults.length} />
        </>
      )}
      <div
        ref={editorRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="editor-area flex-1 flex p-2 pt-5 overflow-auto relative"
        style={{ overflowX: 'auto' }}
        onClick={() => editorRef.current?.focus()}
      >
        {!currentFile ? (
          <div className="m-auto text-center text-gray-500">
            <h2 className="text-xl font-semibold mb-2">Bienvenido al Editor</h2>
            <p>Arrastra y suelta archivos de texto aquí.</p>
          </div>
        ) : (
          <div className="flex w-full font-mono text-sm leading-relaxed">
            <div className="text-right pr-4 text-gray-500 select-none">
              {currentFile.content.split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}
            </div>
            <div className="relative w-full text-gray-300" style={{ whiteSpace: 'pre' }}>
              {currentFile.content.split('\n').map((line, lineIndex) => {
                const letterStartIndex = getLetterStartIndex(line);
                return (
                  <div
                    key={lineIndex}
                    className="relative"
                    onClick={(e) => {
                      const { clientX } = e;
                      const lineEl = e.currentTarget;
                      const charSpans = Array.from(lineEl.querySelectorAll('span[data-char-index]'));
                      let closestCharIndex = line.length;
                      if (charSpans.length > 0) {
                        let minDistance = Infinity;
                        charSpans.forEach((span, index) => {
                          const rect = span.getBoundingClientRect();
                          const mid = rect.left + rect.width / 2;
                          const distance = Math.abs(clientX - mid);
                          if (distance < minDistance) {
                            minDistance = distance;
                            closestCharIndex = clientX < mid ? index : index + 1;
                          }
                        });
                      }
                      setCursorPosition({ line: lineIndex, char: closestCharIndex });
                    }}
                  >
                    {line.split('').map((char, charIndex) => {
                      const isHovered = hoveredPosition?.line === lineIndex && hoveredPosition?.char === charIndex;
                      const isCursorBehind = cursorPosition?.line === lineIndex && cursorPosition?.char === charIndex + 1;
                      const showTooltip = (isHovered || isCursorBehind) && charIndex >= letterStartIndex;
                      return (
                        <span
                          key={charIndex}
                          data-char-index={charIndex}
                          className={`relative ${isHighlighted(lineIndex, charIndex) ? 'bg-purple-400 bg-opacity-70 rounded-sm' : ''}`}
                          onMouseEnter={() => setHoveredPosition({ line: lineIndex, char: charIndex })}
                        >
                          {showTooltip && (
                            <div className="absolute bottom-full left-1/2 mb-1 transform -translate-x-1/2 px-1 py-0.5 bg-gray-800 text-white text-xs rounded z-50 whitespace-nowrap">
                              {charIndex - letterStartIndex + 1}
                            </div>
                          )}
                          {char}
                          {isCursorBehind && <span className="blinking-cursor">|</span>}
                        </span>
                      );
                    })}
                    {cursorPosition?.line === lineIndex && cursorPosition?.char === line.length && (
                      <span className="blinking-cursor">|</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [openedFiles, setOpenedFiles] = useState([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [notification, setNotification] = useState({ message: '', type: '' });

  useEffect(() => {
    const savedFiles = localStorage.getItem('myEditorOpenedFiles');
    const savedIndex = localStorage.getItem('myEditorCurrentFileIndex');
    if (savedFiles) {
      setOpenedFiles(JSON.parse(savedFiles));
    }
    if (savedIndex) {
      setCurrentFileIndex(parseInt(savedIndex));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('myEditorOpenedFiles', JSON.stringify(openedFiles));
    localStorage.setItem('myEditorCurrentFileIndex', currentFileIndex);
  }, [openedFiles, currentFileIndex]);

  return (
    <div className="h-screen flex">
      <ActivityBar />
      <FileExplorer openedFiles={openedFiles} currentFileIndex={currentFileIndex} setCurrentFileIndex={setCurrentFileIndex} />
      <Editor
        openedFiles={openedFiles}
        currentFileIndex={currentFileIndex}
        setOpenedFiles={setOpenedFiles}
        setCurrentFileIndex={setCurrentFileIndex}
        setNotification={setNotification}
      />
      <Notification message={notification.message} type={notification.type} onDismiss={() => setNotification({ message: '', type: '' })} />
    </div>
  );
}
