$ErrorActionPreference = "Stop"
Set-Location "C:\Users\Shivang\Documents\JOB Finder"

$startLog = "C:\Users\Shivang\Documents\JOB Finder\e2e-start.log"
$startErr = "C:\Users\Shivang\Documents\JOB Finder\e2e-start.err"
$port = Get-Random -Minimum 3200 -Maximum 3999
$server = Start-Process -FilePath "cmd.exe" `
  -ArgumentList "/c", "cd /d ""C:\Users\Shivang\Documents\JOB Finder"" && npm run start --workspace web -- --port $port" `
  -RedirectStandardOutput $startLog `
  -RedirectStandardError $startErr `
  -PassThru

$base = "http://127.0.0.1:$port"
$resultPath = "C:\Users\Shivang\Documents\JOB Finder\e2e-result.json"
$errorPath = "C:\Users\Shivang\Documents\JOB Finder\e2e-error.txt"
if (Test-Path $resultPath) { Remove-Item $resultPath -Force }
if (Test-Path $errorPath) { Remove-Item $errorPath -Force }

try {
  $ready = $false
  for ($i = 0; $i -lt 25; $i++) {
    Start-Sleep -Seconds 1
    try {
      $resp = Invoke-WebRequest "$base/" -UseBasicParsing
      if ($resp.StatusCode -eq 200) {
        $ready = $true
        break
      }
    } catch {}
  }

  if (-not $ready) {
    throw "Production server did not become ready on port $port."
  }

  Invoke-RestMethod "$base/api/admin/reset" -Method Post -ContentType "application/json" -Body "{}" | Out-Null

  Add-Type -AssemblyName System.Net.Http
  $client = New-Object System.Net.Http.HttpClient
  $multipart = New-Object System.Net.Http.MultipartFormDataContent
  $multipart.Add((New-Object System.Net.Http.StringContent("demo-user")), "userId")
  $multipart.Add((New-Object System.Net.Http.StringContent("")), "resumeText")
  $filePath = "C:\Users\Shivang\Downloads\SHIVANG LATEST_compressed.pdf"
  $bytes = [System.IO.File]::ReadAllBytes($filePath)
  $fileContent = New-Object System.Net.Http.ByteArrayContent(,$bytes)
  $fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("application/pdf")
  $multipart.Add($fileContent, "file", [System.IO.Path]::GetFileName($filePath))
  $uploadResponse = $client.PostAsync("$base/api/resume/upload", $multipart).Result
  $uploadText = $uploadResponse.Content.ReadAsStringAsync().Result
  if (-not $uploadResponse.IsSuccessStatusCode) {
    throw "Resume upload failed: $($uploadResponse.StatusCode) $uploadText"
  }
  $uploadJson = $uploadText | ConvertFrom-Json

  $resumeId = $uploadJson.resume.id
  $searchPayload = @{
    userId = "demo-user"
    resumeId = $resumeId
    country = "Global"
    location = "Remote"
    domain = $uploadJson.suggestedDomain
    postingWindow = "15d"
  } | ConvertTo-Json
  $search = Invoke-RestMethod "$base/api/search/run" -Method Post -ContentType "application/json" -Body $searchPayload

  $jobsUrl = "$base/api/jobs?userId=demo-user&resumeId=$resumeId&minScore=0&riskMax=high&country=Global&location=Remote&postingWindow=15d"
  $jobs = Invoke-RestMethod $jobsUrl -UseBasicParsing
  $jobCount = @($jobs.jobs).Count
  if ($jobCount -lt 1) {
    throw "No jobs returned from /api/jobs after search."
  }

  $firstJob = $jobs.jobs[0]
  $appendPayload = @{
    userId = "demo-user"
    resumeId = $resumeId
    country = "Global"
    location = "Remote"
    domain = $uploadJson.suggestedDomain
    postingWindow = "15d"
    mode = "append"
    excludeJobIds = @($jobs.jobs | Select-Object -ExpandProperty id)
  } | ConvertTo-Json -Depth 5
  Invoke-RestMethod "$base/api/search/run" -Method Post -ContentType "application/json" -Body $appendPayload | Out-Null
  $jobsAfterAppend = Invoke-RestMethod $jobsUrl -UseBasicParsing

  $optPayload = @{ userId = "demo-user"; resumeId = $resumeId } | ConvertTo-Json
  $opt = Invoke-RestMethod "$base/api/jobs/$($firstJob.id)/optimize" -Method Post -ContentType "application/json" -Body $optPayload

  $origPdf = Invoke-WebRequest "$base/api/documents/pdf?userId=demo-user&resumeId=$resumeId&type=original_resume" -UseBasicParsing
  $tailoredPdf = Invoke-WebRequest "$base/api/documents/pdf?userId=demo-user&resumeId=$resumeId&jobId=$($firstJob.id)&type=tailored_resume" -UseBasicParsing
  $coverPdf = Invoke-WebRequest "$base/api/documents/pdf?userId=demo-user&resumeId=$resumeId&jobId=$($firstJob.id)&type=cover_letter" -UseBasicParsing

  $appPayload = @{ userId = "demo-user"; jobId = $firstJob.id; stage = "applied" } | ConvertTo-Json
  $createdApp = Invoke-RestMethod "$base/api/applications" -Method Post -ContentType "application/json" -Body $appPayload
  $stagePayload = @{ userId = "demo-user"; stage = "screen"; source = "manual" } | ConvertTo-Json
  Invoke-RestMethod "$base/api/applications/$($createdApp.application.id)/stage" -Method Patch -ContentType "application/json" -Body $stagePayload | Out-Null
  $apps = Invoke-RestMethod "$base/api/applications?userId=demo-user" -UseBasicParsing

  $originalHeader = ($uploadJson.extractedText -split "`r?`n" | Select-Object -First 5) -join " | "
  $tailoredHeader = ($opt.recommendation.tailoredResume -split "`r?`n" | Select-Object -First 5) -join " | "

  [pscustomobject]@{
    home_status = "ok"
    resume_id = $resumeId
    parsed_level = $uploadJson.resume.experienceLevel
    suggested_domain = $uploadJson.suggestedDomain
    parsed_skill_count = @($uploadJson.resume.parsedSkills).Count
    search_total_jobs = $search.searchRun.totalJobs
    listed_jobs_after_search = $jobCount
    listed_jobs_after_append = @($jobsAfterAppend.jobs).Count
    first_job_title = $firstJob.title
    first_job_company = $firstJob.company
    first_job_apply_url = $firstJob.applyUrl
    optimization_keyword_gap_count = @($opt.recommendation.keywordGap).Count
    truth_warning_count = @($opt.recommendation.truthGuardWarnings).Count
    original_header_preview = $originalHeader
    tailored_header_preview = $tailoredHeader
    original_pdf_content_type = $origPdf.Headers["Content-Type"]
    tailored_pdf_content_type = $tailoredPdf.Headers["Content-Type"]
    cover_pdf_content_type = $coverPdf.Headers["Content-Type"]
    applications_count = @($apps.applications).Count
    application_stage = $apps.applications[0].stage
  } | ConvertTo-Json -Depth 6 | Set-Content $resultPath
}
catch {
  $_ | Out-String | Set-Content $errorPath
  throw
}
finally {
  if ($server -and -not $server.HasExited) {
    Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
  }
}
