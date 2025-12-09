$file = 'E:/ANA/ana-interface/src/App.jsx'
$content = Get-Content $file -Raw

# 1. Ajouter import IconThumbsUp
$content = $content -replace '(IconMaximize\r?\n\} from)', "IconMaximize,`n  IconThumbsUp`n} from"

# 2. Ajouter import FeedbackPage
$content = $content -replace "(import UpscalerPage from './pages/UpscalerPage';)", "`$1`nimport FeedbackPage from './pages/FeedbackPage';"

# 3. Ajouter dans additionalPages
$content = $content -replace "(\{ path: '/logs', icon: IconFileText, label: 'Logs' \},)", "`$1`n    { path: '/feedback', icon: IconThumbsUp, label: 'Feedback' },"

# 4. Ajouter Route
$content = $content -replace "(<Route path=`"/voice`" element=\{<VoicePage />\} />)", "`$1`n          <Route path=`"/feedback`" element={<FeedbackPage />} />"

Set-Content $file -Value $content -NoNewline
Write-Host 'App.jsx patched successfully'
