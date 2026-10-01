param([int]$Port = 8788, [switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$buildRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'dist'))
if (-not (Test-Path -LiteralPath (Join-Path $buildRoot 'index.html'))) {
  Write-Output 'Build ausente. Execute npm install e npm run build.'
  exit 1
}
$listener = [Net.HttpListener]::new()
$url = "http://localhost:$Port/"
$listener.Prefixes.Add($url)
try { $listener.Start() } catch {
  Write-Output "Nao foi possivel abrir $url. A porta pode estar ocupada."
  exit 1
}
$mime = @{ '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.json'='application/json'; '.png'='image/png'; '.svg'='image/svg+xml'; '.ico'='image/x-icon' }
Write-Output "Gerador de Arvores e Pedras: $url"
Write-Output 'Mantenha esta janela aberta. Pressione Ctrl+C para encerrar.'
if (-not $NoBrowser) { Start-Process $url }
try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $response = $context.Response
    try {
      $relative = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath).TrimStart('/')
      if (-not $relative) { $relative = 'index.html' }
      $target = [IO.Path]::GetFullPath((Join-Path $buildRoot $relative))
      if (-not $target.StartsWith($buildRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $target -PathType Leaf)) {
        $response.StatusCode = 404
      } else {
        $extension = [IO.Path]::GetExtension($target)
        $response.ContentType = if ($mime.ContainsKey($extension)) { $mime[$extension] } else { 'application/octet-stream' }
        $bytes = [IO.File]::ReadAllBytes($target)
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
      }
    } finally { $response.Close() }
  }
} finally { $listener.Stop(); $listener.Close() }
