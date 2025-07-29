// Importa React y varios "Hooks" esenciales desde la librería de React.
// useState: Para manejar el estado interno de los componentes (datos que cambian).
// useCallback: Para memorizar funciones y evitar que se re-creen en cada renderizado, optimizando el rendimiento.
// useEffect: Para ejecutar efectos secundarios (como llamadas a API, suscripciones, o manipulación del DOM) después del renderizado.
// useRef: Para crear una referencia mutable a un elemento del DOM o a un valor que persiste entre renderizados.
import React, { useState, useCallback, useEffect, useRef } from 'react';

// Importa íconos específicos como componentes de React desde la librería 'lucide-react'.
// Estos se usarán para la interfaz de usuario, como botones y elementos visuales.
import { File, Files, GitBranch, Search, X, ChevronRight, ReplaceAll } from 'lucide-react';

// Función de utilidad para "escapar" caracteres especiales en un string.
// Esto es crucial para que un texto de búsqueda del usuario pueda ser usado de forma segura en una Expresión Regular (RegExp).
function escapeRegExp(string) {
  // Reemplaza cada carácter especial de RegExp (como ., *, +, ?, etc.) con una versión escapada (ej. \. \* \+).
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Componente funcional que inyecta una hoja de estilos CSS en el DOM.
// Se usa para definir la animación del cursor parpadeante y otros estilos globales del editor.
const BlinkingCursorStyle = () => (
  <style>{`
    /* Define una animación llamada 'blink' para el parpadeo */
    @keyframes blink {
      0%, 100% { opacity: 1; } /* El cursor es visible al inicio y al final */
      50% { opacity: 0; }      /* El cursor es invisible a la mitad de la animación */
    }
    /* Clase para el cursor que aplica la animación */
    .blinking-cursor {
      font-weight: bold; /* Hace el cursor un poco más grueso */
      animation: blink 1s step-end infinite; /* Aplica la animación 'blink' infinitamente */
      color: white; /* Color del cursor */
    }
    /* Estilo para el área del editor cuando tiene el foco, para quitar el borde por defecto del navegador */
    .editor-area:focus {
      outline: none;
    }
  `}</style>
);

// Componente para renderizar un ícono en la barra de actividad con un tooltip que aparece al pasar el ratón.
// Recibe el componente del ícono (Icon) y el texto del tooltip (title) como props.
const ActivityBarIcon = ({ icon: Icon, title }) => (
  // Contenedor principal del ícono. 'relative' y 'group' son para el posicionamiento y el efecto hover del tooltip.
  <div className="relative group cursor-pointer">
    {/* Renderiza el componente del ícono con estilos de Tailwind CSS. Cambia de color al hacer hover. */}
    <Icon className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
    {/* El tooltip. Es invisible por defecto ('opacity-0') y se hace visible al hacer hover en el 'group'. */}
    <div className="absolute left-full ml-3 px-2 py-1 bg-black text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
      {title}
    </div>
  </div>
);

// Componente que representa la barra lateral de actividad (la barra de íconos a la izquierda).
const ActivityBar = () => (
  // Contenedor de la barra con estilos de color, tamaño y alineación.
  <div className="w-12 h-full bg-[#333333] flex flex-col items-center py-4 space-y-6">
    {/* Renderiza los íconos de la barra de actividad usando el componente ActivityBarIcon. */}
    <ActivityBarIcon icon={Files} title="Explorador" />
    <ActivityBarIcon icon={Search} title="Buscar" />
    <ActivityBarIcon icon={GitBranch} title="Control de código fuente" />
  </div>
);

// Componente que muestra el panel del explorador de archivos.
// Recibe la lista de archivos abiertos, el índice del archivo actual y la función para cambiarlo.
const FileExplorer = ({ openedFiles, currentFileIndex, setCurrentFileIndex }) => (
  // Contenedor del explorador con estilos y scroll vertical si es necesario.
  <div className="w-64 h-full bg-[#252526] overflow-y-auto">
    {/* Título del panel "Explorador". */}
    <div className="p-2.5 text-xs text-gray-400 font-bold uppercase">Explorador</div>
    {/* Renderizado condicional: si hay archivos abiertos, los mapea y muestra. */}
    {openedFiles.length > 0 ? (
      openedFiles.map((file, index) => (
        // Contenedor para cada archivo en la lista.
        <div
          key={index} // Clave única para cada elemento en la lista, importante para React.
          // Clases de estilo condicionales: un fondo si es el archivo actual, otro para el hover.
          className={`px-4 py-1 text-sm text-gray-300 flex items-center cursor-pointer rounded 
          ${currentFileIndex === index ? 'bg-gray-700/50' : 'hover:bg-gray-700/30'}`}
          // Al hacer clic, se llama a la función para cambiar el archivo actual.
          onClick={() => setCurrentFileIndex(index)}
        >
          {/* Ícono de archivo. */}
          <File className="w-4 h-4 mr-2 text-blue-400" />
          {/* Nombre del archivo. */}
          <span>{file.name}</span>
        </div>
      ))
    ) : (
      // Si no hay archivos abiertos, muestra este mensaje.
      <div className="px-4 py-2 text-sm text-gray-500">
        No hay ninguna carpeta abierta.
      </div>
    )}
  </div>
);

// Componente para la barra de búsqueda y reemplazo.
const SearchAndReplaceBar = ({ 
    searchQuery, setSearchQuery, 
    replaceQuery, setReplaceQuery,
    searchResultsCount, 
    onReplaceAll
}) => {
  // Estado local para controlar si el campo de reemplazo está visible o no.
  const [isReplaceOpen, setIsReplaceOpen] = useState(false);

  return (
    // Contenedor principal de la barra de búsqueda.
    <div className="bg-[#252526] p-2 border-b border-t border-gray-700 z-20 relative">
      <div className="flex items-start space-x-2">
        {/* Botón con una flecha para mostrar/ocultar el campo de reemplazo. */}
        <button onClick={() => setIsReplaceOpen(!isReplaceOpen)} className="p-1 mt-1 hover:bg-gray-700 rounded">
          {/* El ícono de la flecha rota 90 grados si el campo de reemplazo está abierto. */}
          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isReplaceOpen ? 'rotate-90' : ''}`} />
        </button>
        <div className="flex-1 flex flex-col space-y-1">
          {/* Input para el término de búsqueda. */}
          <div className="flex items-center bg-zinc-700/50 rounded px-1 border border-transparent focus-within:border-blue-500">
            <input
              type="text"
              placeholder="Buscar"
              value={searchQuery} // El valor está controlado por el estado del componente padre.
              onChange={(e) => setSearchQuery(e.target.value)} // Actualiza el estado al escribir.
              className="bg-transparent text-white placeholder-gray-400 text-sm focus:outline-none w-full py-1"
            />
            {/* Muestra el número de resultados si hay un término de búsqueda. */}
            {searchQuery && (
              <span className="text-gray-400 text-xs px-2 whitespace-nowrap">
                {searchResultsCount} {searchResultsCount === 1 ? 'resultado' : 'resultados'}
              </span>
            )}
          </div>

          {/* Renderizado condicional del input de reemplazo. */}
          {isReplaceOpen && (
            <div className="flex items-center bg-zinc-700/50 rounded px-1 border border-transparent focus-within:border-blue-500">
              <input
                type="text"
                placeholder="Reemplazar"
                value={replaceQuery} // Controlado por el estado del padre.
                onChange={(e) => setReplaceQuery(e.target.value)} // Actualiza el estado al escribir.
                className="bg-transparent text-white placeholder-gray-400 text-sm focus:outline-none w-full py-1"
              />
              {/* Botón para ejecutar la acción de "Reemplazar todo". */}
              <button onClick={onReplaceAll} title="Reemplazar todo" className="p-1 hover:bg-gray-600 rounded disabled:opacity-50" disabled={!searchQuery}>
                <ReplaceAll className="w-5 h-5 text-gray-300" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente para mostrar notificaciones emergentes.
const Notification = ({ message, type, onDismiss }) => {
  // Si no hay mensaje, no renderiza nada.
  if (!message) return null;

  // Estilos base para todas las notificaciones.
  const baseStyle = "fixed top-5 right-5 p-4 rounded-md shadow-lg text-white flex items-center z-50 transition-opacity duration-300";
  // Estilos específicos para cada tipo de notificación (error, éxito, etc.).
  const typeStyles = {
    error: "bg-red-600",
    success: "bg-green-600",
    info: "bg-blue-600",
  };

  // Hook useEffect para que la notificación desaparezca automáticamente después de 4 segundos.
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    // Función de limpieza: se ejecuta si el componente se desmonta antes de que pasen los 4s.
    return () => clearTimeout(timer);
  }, [onDismiss]); // Se vuelve a ejecutar solo si la función onDismiss cambia.

  return (
    // Contenedor de la notificación con estilos combinados.
    <div className={`${baseStyle} ${typeStyles[type] || 'bg-gray-800'}`}>
      <span>{message}</span>
      {/* Botón 'X' para cerrar la notificación manualmente. */}
      <X className="w-5 h-5 ml-4 cursor-pointer" onClick={onDismiss} />
    </div>
  );
};

// Función de utilidad para obtener el índice donde comienza el contenido "real" de una línea.
// Asume un formato específico donde las primeras 3 partes separadas por ';' son metadatos.
const getLetterStartIndex = (line, separator = ';') => {
  const parts = line.split(separator);
  if (parts.length > 3) {
    // Devuelve la longitud de las 3 primeras partes más los separadores.
    return parts.slice(0, 3).join(separator).length + 1;
  }
  return 0; // Si no tiene ese formato, el contenido empieza en el índice 0.
};

// Componente para renderizar un único carácter en el editor.
// React.memo es una optimización que evita que el componente se re-renderice si sus props no cambian.
const Character = React.memo(({ char, charIndex, isHighlighted, isCursorAfter, showTooltip, tooltipContent, onMouseEnter }) => (
    <span
      data-char-index={charIndex} // Atributo de datos para identificar el índice del carácter.
      className={`relative ${isHighlighted ? 'bg-indigo-500 bg-opacity-70' : ''}`}
      onMouseEnter={onMouseEnter} // Evento para cuando el ratón entra en el carácter.
    >
      {/* Muestra un tooltip si la prop showTooltip es verdadera. */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 mb-1 transform -translate-x-1/2 px-1 py-0.5 bg-gray-800 text-white text-xs rounded z-50 whitespace-nowrap">
          {tooltipContent}
        </div>
      )}
      {/* El carácter en sí. */}
      {char}
      {/* Muestra el cursor parpadeante si la prop isCursorAfter es verdadera. */}
      {isCursorAfter && <span className="blinking-cursor">|</span>}
    </span>
));

// El componente principal del editor de texto.
const Editor = ({ openedFiles, currentFileIndex, setOpenedFiles, setCurrentFileIndex, setNotification }) => {
  // Estado para saber si se está arrastrando un archivo sobre el editor.
  const [isDragging, setIsDragging] = useState(false);
  // Estado para el texto en el campo de búsqueda.
  const [searchQuery, setSearchQuery] = useState('');
  // Estado para el texto en el campo de reemplazo.
  const [replaceQuery, setReplaceQuery] = useState('');
  // Estado para almacenar los resultados de la búsqueda (un array de objetos con posiciones).
  const [searchResults, setSearchResults] = useState([]);
  // Estado para la posición del carácter sobre el que está el ratón.
  const [hoveredPosition, setHoveredPosition] = useState(null);
  // Estado para la posición del cursor de texto (línea y carácter).
  const [cursorPosition, setCursorPosition] = useState({ line: 0, char: 0 });
  // Estado para el historial de cambios (para deshacer/rehacer).
  const [history, setHistory] = useState([]);
  // Índice actual en el historial de cambios.
  const [historyIndex, setHistoryIndex] = useState(-1);
  // Referencia al div principal del editor para poder enfocarlo.
  const editorRef = useRef(null);

  // Obtiene el objeto del archivo actual para un acceso más fácil.
  const currentFile = openedFiles[currentFileIndex];

  // Función centralizada para actualizar el contenido del archivo y el historial.
  const updateContentAndHistory = (newContent, addToHistory = true) => {
    const newFiles = [...openedFiles]; // Crea una copia del array de archivos.
    if (!newFiles[currentFileIndex]) return; // Si no hay archivo actual, no hace nada.
    // Actualiza el contenido del archivo actual.
    newFiles[currentFileIndex] = { ...currentFile, content: newContent };
    setOpenedFiles(newFiles); // Actualiza el estado global de archivos.

    // Si se debe añadir al historial y el contenido es diferente al último guardado.
    if (addToHistory && (history[historyIndex] !== newContent)) {
      const newHistory = history.slice(0, historyIndex + 1); // Corta el historial futuro (si se deshizo algo).
      newHistory.push(newContent); // Añade el nuevo estado al historial.
      setHistory(newHistory); // Actualiza el historial.
      setHistoryIndex(newHistory.length - 1); // Mueve el puntero al final del historial.
    }
  };
  
  // useEffect que se ejecuta cuando cambia el archivo actual (por índice o por nombre).
  // Se encarga de reiniciar el historial de cambios para el nuevo archivo.
  useEffect(() => {
    if (currentFile) {
      setHistory([currentFile.content]); // Reinicia el historial con el contenido actual.
      setHistoryIndex(0); // Pone el puntero al inicio.
    } else {
      setHistory([]); // Si no hay archivo, vacía el historial.
      setHistoryIndex(-1);
    }
  }, [currentFileIndex, currentFile?.name]); // Dependencias: se ejecuta si cambian.


  // useEffect que se ejecuta cuando cambia el término de búsqueda o el archivo actual.
  // Realiza la búsqueda y actualiza los resultados.
  useEffect(() => {
    // Si no hay búsqueda o archivo, vacía los resultados y termina.
    if (!searchQuery || !currentFile) {
      setSearchResults([]);
      return;
    }

    try {
      const safeSearchQuery = escapeRegExp(searchQuery); // Escapa el texto de búsqueda.
      const regex = new RegExp(safeSearchQuery, 'gi'); // Crea la RegExp (global, insensible a mayúsculas).
      const lines = currentFile.content.split('\n'); // Divide el contenido en líneas.
      const results = []; // Array para guardar las coincidencias.
      lines.forEach((line, lineIndex) => {
        let match;
        // Busca todas las coincidencias en la línea.
        while ((match = regex.exec(line)) !== null) {
          if (match[0].length === 0) { // Evita bucles infinitos en coincidencias de longitud cero.
            regex.lastIndex++;
            continue;
          }
          // Guarda la posición de la coincidencia.
          results.push({
            line: lineIndex,
            start: match.index,
            end: match.index + match[0].length,
          });
        }
      });
      setSearchResults(results); // Actualiza el estado con los resultados.
    } catch {
      setSearchResults([]); // Si la RegExp es inválida, vacía los resultados.
    }
  }, [searchQuery, currentFile]); // Dependencias: se ejecuta si cambian.

  // Función que determina si un carácter en una posición específica debe ser resaltado.
  const isHighlighted = (lineIndex, charIndex) => {
    if (searchQuery.length === 0) return false; // Si no hay búsqueda, no resalta nada.
    // Devuelve true si alguna de las coincidencias en 'searchResults' incluye esta posición.
    return searchResults.some(result =>
      result.line === lineIndex && charIndex >= result.start && charIndex < result.end
    );
  };

  // Lógica para reemplazar todas las coincidencias encontradas.
  const handleReplaceAll = () => {
    if (!currentFile || !searchQuery) return; // No hace nada si no hay archivo o búsqueda.

    try {
        const safeSearchQuery = escapeRegExp(searchQuery);
        const regex = new RegExp(safeSearchQuery, 'gi');
        
        const originalContent = currentFile.content;
        const matches = originalContent.match(regex); // Encuentra cuántas coincidencias hay.
        
        if (!matches || matches.length === 0) {
            setNotification({ message: "No se encontraron coincidencias.", type: 'info' });
            return;
        }
        
        // Reemplaza todas las ocurrencias en el contenido.
        const newContent = originalContent.replace(regex, replaceQuery);

        if (newContent !== originalContent) {
            updateContentAndHistory(newContent); // Actualiza el contenido y el historial.
            setNotification({ message: `Se reemplazaron ${matches.length} instancias.`, type: "success" });
        }
    } catch (error) {
        setNotification({ message: "Error en la expresión de búsqueda.", type: 'error' });
    }
  };


  // Manejador de eventos para las pulsaciones de teclado en el editor.
  const handleKeyDown = (e) => {
    if (!currentFile) return; // No hace nada si no hay un archivo abierto.
    
    // Atajo Ctrl+H (o Cmd+H) para la búsqueda (actualmente no hace nada visible, es una mejora futura).
    if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
    }

    // Atajo Ctrl+S (o Cmd+S) para guardar el archivo.
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault(); // Previene la acción de guardar del navegador.
      // Crea un Blob (objeto binario) con el contenido del archivo.
      const blob = new Blob([currentFile.content], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a'); // Crea un enlace temporal.
      link.href = URL.createObjectURL(blob); // Asigna la URL del Blob al enlace.
      link.download = currentFile.name; // Asigna el nombre del archivo para la descarga.
      link.click(); // Simula un clic en el enlace para iniciar la descarga.
      URL.revokeObjectURL(link.href); // Libera la memoria usada por la URL del Blob.
      setNotification({ message: "Archivo guardado correctamente.", type: "success" });
      return;
    }

    // Atajo Ctrl+Z (o Cmd+Z) para deshacer.
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      if (historyIndex > 0) { // Si hay algo que deshacer.
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex); // Mueve el puntero del historial hacia atrás.
        updateContentAndHistory(history[newIndex], false); // Actualiza el contenido sin añadir al historial.
      }
      return;
    }

    // Atajo Ctrl+Y (o Cmd+Y) para rehacer.
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault();
      if (historyIndex < history.length - 1) { // Si hay algo que rehacer.
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex); // Mueve el puntero del historial hacia adelante.
        updateContentAndHistory(history[newIndex], false); // Actualiza el contenido sin añadir al historial.
      }
      return;
    }

    if (!cursorPosition || currentFile.content === null) return;

    const lines = currentFile.content.split('\n'); // Obtiene las líneas del contenido.
    let { line, char } = cursorPosition; // Desestructura la posición actual del cursor.

    // Previene el comportamiento por defecto para la mayoría de las teclas para tener control total.
    if (!['Meta', 'Control', 'Alt', 'Shift'].includes(e.key)) {
      e.preventDefault();
    }

    let contentChanged = false; // Flag para saber si se debe actualizar el historial.

    // Switch para manejar cada tipo de tecla.
    switch (e.key) {
      case 'ArrowUp': if (line > 0) { line--; char = Math.min(char, lines[line].length); } break;
      case 'ArrowDown': if (line < lines.length - 1) { line++; char = Math.min(char, lines[line].length); } break;
      case 'ArrowLeft': if (char > 0) { char--; } else if (line > 0) { line--; char = lines[line].length; } break;
      case 'ArrowRight': if (char < lines[line].length) { char++; } else if (line < lines.length - 1) { line++; char = 0; } break;
      case 'Home': char = 0; break;
      case 'End': char = lines[line].length; break;
      case 'Backspace':
        if (char > 0) { // Si el cursor no está al principio de la línea.
          lines[line] = lines[line].slice(0, char - 1) + lines[line].slice(char); // Borra el carácter anterior.
          char--;
        } else if (line > 0) { // Si está al principio de la línea y no es la primera línea.
          char = lines[line - 1].length; // Mueve el cursor al final de la línea anterior.
          lines[line - 1] += lines[line]; // Une la línea actual con la anterior.
          lines.splice(line, 1); // Elimina la línea actual.
          line--;
        }
        contentChanged = true;
        break;
      case 'Enter':
        const after = lines[line].slice(char); // El texto después del cursor.
        lines[line] = lines[line].slice(0, char); // El texto antes del cursor.
        lines.splice(line + 1, 0, after); // Inserta una nueva línea con el texto de después.
        line++; char = 0;
        contentChanged = true;
        break;
      default:
        // Si es una tecla imprimible y no se está presionando Ctrl/Cmd.
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          lines[line] = lines[line].slice(0, char) + e.key + lines[line].slice(char); // Inserta el carácter.
          char++;
          contentChanged = true;
        }
    }

    // Si el contenido cambió, se actualiza el estado y el historial.
    if (contentChanged) updateContentAndHistory(lines.join('\n'));
    // Se actualiza la posición del cursor.
    setCursorPosition({ line, char });
  };

  // Manejador para cuando se sueltan archivos sobre el editor (drag and drop).
  // useCallback para optimizar, solo se re-crea si cambian sus dependencias.
  const handleDrop = useCallback((e) => {
    e.preventDefault(); // Previene que el navegador abra el archivo.
    setIsDragging(false); // Desactiva el estado de 'arrastrando'.

    const droppedFiles = e.dataTransfer.files; // Obtiene los archivos soltados.
    if (droppedFiles && droppedFiles.length > 0) {
      let firstNewFileIndex = openedFiles.length; // Guarda el índice donde empezarán los nuevos archivos.

      Array.from(droppedFiles).forEach((file, index) => {
        // Filtra para aceptar solo archivos de texto.
        if (file.type.startsWith("text/") || file.name.includes('.') === false || file.type === "") {
            const reader = new FileReader(); // Crea un lector de archivos.
            reader.onload = (event) => { // Cuando el archivo se ha leído.
                const newContent = event.target.result; // Contenido del archivo.
                const newFile = { name: file.name, content: newContent }; // Crea el objeto de archivo.
                
                // Añade el nuevo archivo al estado de archivos abiertos.
                setOpenedFiles(prev => [...prev, newFile]);
                
                // Cuando se ha procesado el último archivo, se establece como el archivo actual.
                if (index === droppedFiles.length - 1) {
                   setCurrentFileIndex(firstNewFileIndex + index);
                }
            };
            reader.readAsText(file); // Inicia la lectura del archivo como texto.
        } else {
            setNotification({ message: `Error: El archivo '${file.name}' no es de texto.`, type: 'error' });
        }
      });
    }
  }, [openedFiles.length, setOpenedFiles, setCurrentFileIndex, setNotification]);

  // Manejador para cerrar una pestaña de archivo.
  const handleClose = (indexToClose) => {
    // Filtra el array de archivos para quitar el que se va a cerrar.
    const newFiles = openedFiles.filter((_, i) => i !== indexToClose);
    setOpenedFiles(newFiles);

    // Si no quedan archivos, resetea el índice.
    if (newFiles.length === 0) {
        setCurrentFileIndex(0);
        return;
    }

    // Lógica para ajustar el índice del archivo actual después de cerrar uno.
    if (currentFileIndex === indexToClose) {
        // Si se cerró el archivo activo, activa el anterior (o el primero).
        setCurrentFileIndex(Math.max(0, indexToClose - 1));
    } else if (currentFileIndex > indexToClose) {
        // Si se cerró un archivo anterior al activo, decrementa el índice.
        setCurrentFileIndex(currentFileIndex - 1);
    }
  };

  return (
    // Contenedor principal del editor, con manejadores para drag and drop.
    <div
      className="flex-1 h-full bg-[#1E1E1E] flex flex-col"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={() => setIsDragging(true)}
      onDragLeave={() => setIsDragging(false)}
    >
      {/* Inserta los estilos del cursor parpadeante. */}
      <BlinkingCursorStyle />
      {/* Renderiza las pestañas de los archivos si hay al menos uno abierto. */}
      {openedFiles.length > 0 && (
        <div className="flex bg-[#252526] flex-wrap">
            {openedFiles.map((file, index) => (
                <div 
                  key={index} 
                  // Estilos condicionales para la pestaña activa.
                  className={`flex items-center px-4 py-2 text-sm cursor-pointer ${
                      currentFileIndex === index 
                      ? 'bg-[#1E1E1E] text-gray-300 border-t-2 border-blue-500' 
                      : 'bg-[#2D2D2D] text-gray-500 hover:bg-[#3E3E3E]'}`
                  }
                  onClick={() => setCurrentFileIndex(index)} // Cambia de archivo al hacer clic.
                >
                    <File className="w-4 h-4 mr-2 text-blue-400" />
                    <span>{file.name}</span>
                    {/* Botón 'X' para cerrar la pestaña. */}
                    <X className="w-4 h-4 ml-4 hover:bg-gray-600 rounded" onClick={(e) => { e.stopPropagation(); handleClose(index); }} />
                </div>
            ))}
        </div>
      )}

      {/* Muestra la barra de búsqueda si hay un archivo abierto. */}
      {currentFile && (
        <SearchAndReplaceBar 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            replaceQuery={replaceQuery}
            setReplaceQuery={setReplaceQuery}
            searchResultsCount={searchResults.length}
            onReplaceAll={handleReplaceAll}
        />
      )}

      {/* El área principal del editor donde se muestra el texto. */}
      <div
        ref={editorRef} // Asigna la referencia al div.
        tabIndex={0} // Hace que el div sea enfocable.
        onKeyDown={handleKeyDown} // Maneja las pulsaciones de teclado.
        className="editor-area flex-1 flex p-2 pt-5 overflow-auto relative"
        style={{ overflowX: 'auto' }} // Permite scroll horizontal.
        onClick={() => editorRef.current?.focus()} // Enfoca el editor al hacer clic.
      >
        {/* Si no hay archivo, muestra un mensaje de bienvenida. */}
        {!currentFile ? (
          <div className="m-auto text-center text-gray-500">
            <h2 className="text-xl font-semibold mb-2">Bienvenido al Editor</h2>
            <p>Arrastra y suelta archivos de texto aquí para comenzar.</p>
          </div>
        ) : (
          // Si hay un archivo, renderiza el contenido.
          <div className="flex w-full font-mono text-sm leading-relaxed">
            {/* Columna de los números de línea. */}
            <div className="text-right pr-4 text-gray-500 select-none sticky left-0 bg-[#1E1E1E]">
              {currentFile.content.split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}
            </div>
            {/* Contenedor del contenido del texto. */}
            <div className="relative w-full text-gray-300" style={{ whiteSpace: 'pre' }}>
              {currentFile.content.split('\n').map((line, lineIndex) => {
                const letterStartIndex = getLetterStartIndex(line);
                return (
                  // Contenedor para cada línea de texto.
                  <div
                    key={lineIndex}
                    className="relative"
                    // Lógica para posicionar el cursor al hacer clic en una línea.
                    onClick={(e) => {
                      const { clientX } = e; // Posición X del clic.
                      const lineEl = e.currentTarget;
                      const charSpans = Array.from(lineEl.querySelectorAll('span[data-char-index]'));
                      
                      if (charSpans.length === 0) { // Si la línea está vacía.
                          setCursorPosition({ line: lineIndex, char: 0 });
                          return;
                      }

                      let closest = { offset: Infinity, index: line.length };

                      // Encuentra el carácter más cercano a la posición del clic.
                      charSpans.forEach(span => {
                          const rect = span.getBoundingClientRect();
                          const offset = clientX - rect.left;
                          const width = rect.width;
                          if (Math.abs(offset) < Math.abs(closest.offset)) {
                              closest = { offset: offset, index: parseInt(span.dataset.charIndex, 10) + (offset > width / 2 ? 1 : 0) };
                          }
                      });
                      
                      setCursorPosition({ line: lineIndex, char: closest.index });
                    }}
                  >
                    {/* Muestra el cursor al principio de la línea si corresponde. */}
                    {cursorPosition?.line === lineIndex && cursorPosition.char === 0 && <span className="blinking-cursor">|</span>}
                    {/* Mapea cada carácter de la línea al componente Character. */}
                    {line.split('').map((char, charIndex) => {
                        const isHovered = hoveredPosition?.line === lineIndex && hoveredPosition?.char === charIndex;
                        const isCursorAfter = cursorPosition?.line === lineIndex && cursorPosition.char === charIndex + 1;
                        const showTooltip = (isHovered || isCursorAfter) && charIndex >= letterStartIndex;
                        
                        return (
                           <Character
                             key={charIndex}
                             char={char}
                             charIndex={charIndex}
                             isHighlighted={isHighlighted(lineIndex, charIndex)}
                             isCursorAfter={isCursorAfter}
                             showTooltip={showTooltip}
                             tooltipContent={charIndex - letterStartIndex + 1}
                             onMouseEnter={() => setHoveredPosition({ line: lineIndex, char: charIndex })}
                           />
                        );
                    })}
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

// El componente raíz de la aplicación.
export default function App() {
  // Estado para la lista de archivos abiertos.
  const [openedFiles, setOpenedFiles] = useState([]);
  // Estado para el índice del archivo que se está mostrando actualmente.
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  // Estado para el mensaje de notificación.
  const [notification, setNotification] = useState({ message: '', type: '' });

  // useEffect que se ejecuta una sola vez al cargar la aplicación (dependencia vacía []).
  // Se usa para cargar el estado guardado desde localStorage.
  useEffect(() => {
    try {
        const savedFiles = localStorage.getItem('myEditorOpenedFiles');
        const savedIndex = localStorage.getItem('myEditorCurrentFileIndex');
        if (savedFiles) {
            const parsedFiles = JSON.parse(savedFiles);
            if (Array.isArray(parsedFiles)) {
                setOpenedFiles(parsedFiles);
            }
        }
        if (savedIndex) {
            const parsedIndex = parseInt(savedIndex, 10);
            if (!isNaN(parsedIndex)) {
                setCurrentFileIndex(parsedIndex);
            }
        }
    } catch (error) {
        console.error("Failed to load state from localStorage", error);
        setOpenedFiles([]);
        setCurrentFileIndex(0);
    }
  }, []);

  // useEffect que se ejecuta cada vez que 'openedFiles' o 'currentFileIndex' cambian.
  // Se usa para guardar el estado actual en localStorage.
  useEffect(() => {
    try {
        if(openedFiles.length > 0) {
            localStorage.setItem('myEditorOpenedFiles', JSON.stringify(openedFiles));
            localStorage.setItem('myEditorCurrentFileIndex', currentFileIndex);
        }
    } catch (error) {
        console.error("Failed to save state to localStorage", error);
    }
  }, [openedFiles, currentFileIndex]);

  // Renderiza la estructura principal de la aplicación.
  return (
    // Contenedor principal que ocupa toda la pantalla.
    <div className="h-screen w-screen bg-[#1E1E1E] flex font-sans">
      {/* Barra de actividad a la izquierda. */}
      <ActivityBar />
      {/* Explorador de archivos. */}
      <FileExplorer openedFiles={openedFiles} currentFileIndex={currentFileIndex} setCurrentFileIndex={setCurrentFileIndex} />
      {/* El editor de texto principal. */}
      <Editor
        openedFiles={openedFiles}
        currentFileIndex={currentFileIndex}
        setOpenedFiles={setOpenedFiles}
        setCurrentFileIndex={setCurrentFileIndex}
        setNotification={setNotification}
      />
      {/* El componente de notificación (solo visible cuando hay un mensaje). */}
      <Notification message={notification.message} type={notification.type} onDismiss={() => setNotification({ message: '', type: '' })} />
    </div>
  );
}
