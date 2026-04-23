#!/bin/bash

# Default port
PORT=8000

PORT=8000

PYTHON_CMD="python3"
if ! command -v python3 &>/dev/null; then
    PYTHON_CMD="python"
fi

# Chiude eventuali istanze precedenti sulla stessa porta per garantire la persistenza dei dati (IndexedDB)
echo "Reset della porta $PORT..."
pkill -f "$PYTHON_CMD -m http.server $PORT" 2>/dev/null

# Attesa breve per assicurarsi che la porta sia liberata
sleep 1

echo "Avvio Manga Box sulla porta $PORT..."

cd "$(dirname "$0")"
$PYTHON_CMD -m http.server $PORT &

sleep 1

URL="http://localhost:$PORT"
if command -v xdg-open &>/dev/null; then
    xdg-open "$URL" 2>/dev/null
elif command -v open &>/dev/null; then
    open "$URL" 2>/dev/null
else
    echo "Server avviato! Apri manualmente: $URL"
fi
