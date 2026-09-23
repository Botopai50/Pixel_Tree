# Preview server for machines without Node.js.
#
# Vite needs Node, so this serves the project's source files over HTTP and
# _preview.html compiles the TypeScript in the browser instead (TypeScript from
# a CDN, React/three/lucide via an import map, Tailwind via its browser build).
#
# Run:   powershell -ExecutionPolicy Bypass -File _preview-server.ps1
# Open:  http://localhost:8787/_preview.html
# Stop:  Ctrl+C, or open http://localhost:8787/__quit
#
# Once Node is installed, prefer the real toolchain: npm install && npm run dev

$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"
  ".mjs"  = "text/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".ts"   = "text/plain; charset=utf-8"
  ".tsx"  = "text/plain; charset=utf-8"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".svg"  = "image/svg+xml"
  ".ico"  = "image/x-icon"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8787/")
try {
  $listener.Start()
} catch {
  Write-Output "Could not bind http://localhost:8787/ - is it already in use?"
  exit 1
}
Write-Output "Serving $root"
Write-Output "Open http://localhost:8787/_preview.html"

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response
    $res.Headers.Add("Access-Control-Allow-Origin", "*")
    $res.Headers.Add("Cache-Control", "no-store")
    $rel = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath.TrimStart('/'))

    if ($rel -eq "__quit") { $res.StatusCode = 200; $res.Close(); break }

    # the file list _preview.html compiles
    if ($rel -eq "__list") {
      $files = Get-ChildItem -Path $root -Recurse -File -Include *.ts,*.tsx |
        ForEach-Object { $_.FullName.Substring($root.Length + 1).Replace('\','/') }
      $bytes = [System.Text.Encoding]::UTF8.GetBytes(($files | ConvertTo-Json -Compress))
      $res.ContentType = "application/json; charset=utf-8"
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
      $res.Close()
      continue
    }

    if ($rel -eq "") { $rel = "_preview.html" }

    $path = Join-Path $root $rel
    if (Test-Path -LiteralPath $path -PathType Leaf) {
      $bytes = [System.IO.File]::ReadAllBytes($path)
      $ext = [System.IO.Path]::GetExtension($path).ToLower()
      if ($mime.ContainsKey($ext)) { $res.ContentType = $mime[$ext] } else { $res.ContentType = "application/octet-stream" }
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $res.StatusCode = 404
      $b = [System.Text.Encoding]::UTF8.GetBytes("404 " + $rel)
      $res.OutputStream.Write($b, 0, $b.Length)
    }
    $res.Close()
  } catch {
    Write-Output ("ERR " + $_.Exception.Message)
  }
}
$listener.Stop()
Write-Output "Stopped"
