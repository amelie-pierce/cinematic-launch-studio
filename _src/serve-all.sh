#!/bin/zsh
# Start every prototype's Vite dev server on its own port (9101..9110)
cd "${0:A:h}/apps"
port=9101
mkdir -p ../logs
for app in ACE ADC ADM AGPD FD HCS HS PBS PFD RWS; do
  (cd $app/code && PORT=$port FIGMA_DEV_SERVER_HOST=127.0.0.1 nohup ./node_modules/.bin/vite --port $port --strictPort > ../../../logs/$app.log 2>&1 &)
  echo "$app http://127.0.0.1:$port"
  port=$((port+1))
done
