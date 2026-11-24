# S.u.G WALK R7: V3-only road visibility / 3D building contrast trial.
# No network, no Git, no new project, no token access.
$ErrorActionPreference = 'Stop'
$p = 'C:\Users\User\SUG-QUEST\isolated\r7-native-review\WALK-BUILD3\iOS\Resources\Web\five\osaka-3d.js'
if (!(Test-Path -LiteralPath $p -PathType Leaf)) { throw "STOP: Missing $p" }
$s = [IO.File]::ReadAllText($p)
if ($s.Contains('sug-r7-v4-safe-visual')) { Write-Host 'ALREADY_APPLIED: no modification'; exit 0 }
if (!$s.Contains('sug-r7-perspective-v3')) { throw 'STOP: Expected V3 file not found; no modification.' }
# Read the current PC file. Never overwrite a different revision.
$rules = @(
  @('center:ui.center(),zoom:18.1,pitch:80,maxPitch:85,antialias:true', 'center:ui.center(),zoom:17.7,pitch:78,maxPitch:85,antialias:true'),
  @("active.setPaintProperty(layer.id,'line-color',layer.id.includes('case') ? '#402544' : '#272030');", "active.setPaintProperty(layer.id,'line-color',layer.id.includes('case') ? '#30233b' : '#191a25');"),
  @("'fill-extrusion-color':'#4c365a','fill-extrusion-opacity':0.76}},", "'fill-extrusion-color':'#33435a','fill-extrusion-opacity':0.72}},"),
  @("'line-blur':0.6,'line-opacity':0.58}},firstLabel);", @'
'line-blur':1.2,'line-opacity':0.32}},firstLabel);
          // sug-r7-v4-safe-visual: thin luminous core on selected real road features, not a route.
          active.addLayer({id:'osaka-road-neon-core-v4',type:'line',source:'composite','source-layer':'road',
            filter:['in',['get','class'],['literal',['primary','secondary','tertiary','street']]],
            paint:{'line-color':'#ff72ca','line-width':['interpolate',['linear'],['zoom'],15,0.3,18,0.6,20,1.2],
              'line-opacity':0.82}},firstLabel);
'@.TrimEnd("`r","`n"))
)
foreach ($pair in $rules) {
  $needle = $pair[0]
  $a = $s.IndexOf($needle,[StringComparison]::Ordinal)
  if ($a -lt 0 -or $s.IndexOf($needle,$a+$needle.Length,[StringComparison]::Ordinal) -ge 0) {
    throw "STOP: Source has changed or ambiguous: $needle"
  }
}
$out=$s
foreach ($pair in $rules) { $out=$out.Replace($pair[0],$pair[1]) }
if (!$out.Contains('sug-r7-v4-safe-visual') -or $out -ceq $s) { throw 'STOP: patch preflight failed' }
$stamp=Get-Date -Format 'yyyyMMdd-HHmmss'
$backup="$p.backup-before-v4-$stamp"
$tmp="$p.v4check-$stamp.js"
$utf8 = [Text.UTF8Encoding]::new($false)
try {
  [IO.File]::WriteAllText($tmp,$out,$utf8)
  $node=Get-Command node -ErrorAction SilentlyContinue
  if ($node) {
    & $node.Source --check $tmp
    if ($LASTEXITCODE -ne 0) { throw 'STOP: JavaScript syntax check failed; source unchanged' }
    Write-Host 'JS_SYNTAX: PASS (node --check)'
  } else {
    Write-Host 'JS_SYNTAX: NOT CHECKED (Node.js unavailable)'
  }
  Copy-Item -LiteralPath $p -Destination $backup -ErrorAction Stop
  [IO.File]::WriteAllText($p,$out,$utf8)
  if ([IO.File]::ReadAllText($p) -cne $out) { throw 'Readback verification failed' }
  Write-Host 'PATCH_WRITTEN: V4 limited visual trial'
  Write-Host "BACKUP: $backup"
  Write-Host 'CHANGES: camera 17.7/78; softer building contrast; dark roads + thin pink neon core'
  Write-Host 'UNCHANGED: 2D, GPS, public token, five-screen navigation, Git'
  Write-Host 'EDGE_RENDER: NOT VERIFIED. Reload Ctrl+Shift+R and inspect 3D.'
} catch {
  if (Test-Path -LiteralPath $backup) { Copy-Item -LiteralPath $backup -Destination $p -Force }
  throw
} finally {
  Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
}
