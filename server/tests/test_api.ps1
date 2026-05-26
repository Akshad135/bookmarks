# Comprehensive Backend Test Suite
# Tests all API endpoints of the bookmark-server

$ErrorActionPreference = "Stop"
$base = "http://localhost:3000"
$pass = 0
$fail = 0

function Test($name, $scriptblock) {
    try {
        $result = & $scriptblock
        if ($result -eq $true) {
            Write-Host "  PASS  $name" -ForegroundColor Green
            $script:pass++
        } else {
            Write-Host "  FAIL  $name (returned false)" -ForegroundColor Red
            $script:fail++
        }
    } catch {
        Write-Host "  FAIL  $name : $($_.Exception.Message)" -ForegroundColor Red
        $script:fail++
    }
}

# Wait for server
Start-Sleep -Seconds 2

Write-Host "`n=============================="
Write-Host " BACKEND TEST SUITE"
Write-Host "==============================`n"

# ── CONFIG (public) ──────────────────────────────────────────────────────────
Write-Host "[Config]" -ForegroundColor Cyan

Test "GET /api/config returns custom title" {
    $r = Invoke-RestMethod "$base/api/config" -UseBasicParsing
    $r.title -eq "Test Bookmarks"
}

Test "GET /api/config returns custom subtitle" {
    $r = Invoke-RestMethod "$base/api/config" -UseBasicParsing
    $r.subtitle -eq "CI Suite"
}

Test "GET /api/config returns custom icon" {
    $r = Invoke-RestMethod "$base/api/config" -UseBasicParsing
    $r.icon -eq "/test-icon.svg"
}

# ── AUTH ─────────────────────────────────────────────────────────────────────
Write-Host "`n[Auth]" -ForegroundColor Cyan

Test "GET /api/auth/session returns false when not logged in" {
    $r = Invoke-RestMethod "$base/api/auth/session" -UseBasicParsing
    $r.authenticated -eq $false
}

Test "POST /api/auth/login rejects wrong password" {
    try {
        Invoke-WebRequest "$base/api/auth/login" -Method Post -ContentType "application/json" -Body '{"password":"wrong"}' -UseBasicParsing
        $false
    } catch {
        $_.Exception.Response.StatusCode -eq 401
    }
}

Test "POST /api/auth/login accepts correct password" {
    $r = Invoke-WebRequest "$base/api/auth/login" -Method Post -ContentType "application/json" -Body '{"password":"test123"}' -UseBasicParsing
    $r.StatusCode -eq 200
}

Test "POST /api/auth/login sets HttpOnly session cookie" {
    $r = Invoke-WebRequest "$base/api/auth/login" -Method Post -ContentType "application/json" -Body '{"password":"test123"}' -UseBasicParsing
    $cookie = $r.Headers["Set-Cookie"]
    $cookie -match "session=" -and $cookie -match "HttpOnly" -and $cookie -match "SameSite=Strict"
}

# Get a valid session for the rest of the tests
$loginResp = Invoke-WebRequest "$base/api/auth/login" -Method Post -ContentType "application/json" -Body '{"password":"test123"}' -UseBasicParsing
$cookieVal = [regex]::Match($loginResp.Headers["Set-Cookie"], "session=([^;]+)").Groups[1].Value
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$c = New-Object System.Net.Cookie("session", $cookieVal, "/", "localhost")
$session.Cookies.Add($c)

Test "GET /api/auth/session returns true when logged in" {
    $r = Invoke-RestMethod "$base/api/auth/session" -WebSession $session
    $r.authenticated -eq $true
}

# ── AUTH GUARDS ──────────────────────────────────────────────────────────────
Write-Host "`n[Auth Guards]" -ForegroundColor Cyan

Test "GET /api/bookmarks returns 401 without cookie" {
    try { Invoke-RestMethod "$base/api/bookmarks" -UseBasicParsing; $false } catch { $_.Exception.Response.StatusCode -eq 401 }
}

Test "GET /api/collections returns 401 without cookie" {
    try { Invoke-RestMethod "$base/api/collections" -UseBasicParsing; $false } catch { $_.Exception.Response.StatusCode -eq 401 }
}

Test "GET /api/tags returns 401 without cookie" {
    try { Invoke-RestMethod "$base/api/tags" -UseBasicParsing; $false } catch { $_.Exception.Response.StatusCode -eq 401 }
}

Test "POST /api/bookmarks returns 401 without cookie" {
    try { Invoke-WebRequest "$base/api/bookmarks" -Method Post -ContentType "application/json" -Body '{}' -UseBasicParsing; $false } catch { $_.Exception.Response.StatusCode -eq 401 }
}

# ── BOOKMARKS CRUD ───────────────────────────────────────────────────────────
Write-Host "`n[Bookmarks CRUD]" -ForegroundColor Cyan

Test "GET /api/bookmarks returns empty array initially" {
    $r = Invoke-RestMethod "$base/api/bookmarks" -WebSession $session
    @($r).Count -eq 0
}

Test "POST /api/bookmarks creates a bookmark" {
    $body = '{"id":"bm-1","title":"GitHub","url":"https://github.com","description":"Dev platform","favicon":"https://github.com/favicon.ico","thumbnail":"","collectionId":"unsorted","tags":[],"isFavorite":false,"isArchived":false,"isTrashed":false,"isPinned":false,"createdAt":"2024-01-01T00:00:00Z","updatedAt":"2024-01-01T00:00:00Z"}'
    $r = Invoke-RestMethod "$base/api/bookmarks" -Method Post -ContentType "application/json" -Body $body -WebSession $session
    $r.id -eq "bm-1" -and $r.title -eq "GitHub"
}

Test "POST /api/bookmarks creates a second bookmark" {
    $body = '{"id":"bm-2","title":"Stack Overflow","url":"https://stackoverflow.com","description":"Q&A","favicon":"","thumbnail":"","collectionId":"unsorted","tags":["tag-1","tag-2"],"isFavorite":true,"isArchived":false,"isTrashed":false,"isPinned":true,"createdAt":"2024-01-02T00:00:00Z","updatedAt":"2024-01-02T00:00:00Z"}'
    $r = Invoke-RestMethod "$base/api/bookmarks" -Method Post -ContentType "application/json" -Body $body -WebSession $session
    $r.id -eq "bm-2" -and $r.isFavorite -eq $true -and $r.isPinned -eq $true
}

Test "POST /api/bookmarks creates a third bookmark (for trash test)" {
    $body = '{"id":"bm-3","title":"Trash Me","url":"https://example.com","description":"","favicon":"","thumbnail":"","collectionId":"unsorted","tags":[],"isFavorite":false,"isArchived":false,"isTrashed":true,"isPinned":false,"createdAt":"2024-01-03T00:00:00Z","updatedAt":"2024-01-03T00:00:00Z"}'
    $r = Invoke-RestMethod "$base/api/bookmarks" -Method Post -ContentType "application/json" -Body $body -WebSession $session
    $r.isTrashed -eq $true
}

Test "GET /api/bookmarks returns 3 bookmarks" {
    $r = Invoke-RestMethod "$base/api/bookmarks" -WebSession $session
    @($r).Count -eq 3
}

Test "PUT /api/bookmarks/:id partial update (favorite)" {
    $r = Invoke-RestMethod "$base/api/bookmarks/bm-1" -Method Put -ContentType "application/json" -Body '{"isFavorite":true,"updatedAt":"2024-06-01T00:00:00Z"}' -WebSession $session
    $r.isFavorite -eq $true -and $r.title -eq "GitHub" -and $r.updatedAt -eq "2024-06-01T00:00:00Z"
}

Test "PUT /api/bookmarks/:id partial update (tags)" {
    $r = Invoke-RestMethod "$base/api/bookmarks/bm-1" -Method Put -ContentType "application/json" -Body '{"tags":["tag-A","tag-B"],"updatedAt":"2024-06-02T00:00:00Z"}' -WebSession $session
    @($r.tags).Count -eq 2 -and $r.tags[0] -eq "tag-A"
}

Test "PUT /api/bookmarks/:id partial update (move collection)" {
    $r = Invoke-RestMethod "$base/api/bookmarks/bm-1" -Method Put -ContentType "application/json" -Body '{"collectionId":"col-1","updatedAt":"2024-06-03T00:00:00Z"}' -WebSession $session
    $r.collectionId -eq "col-1"
}

Test "PUT /api/bookmarks/:id 404 for nonexistent" {
    try { Invoke-RestMethod "$base/api/bookmarks/nonexistent" -Method Put -ContentType "application/json" -Body '{"title":"x"}' -WebSession $session; $false } catch { $_.Exception.Response.StatusCode -eq 404 }
}

Test "DELETE /api/bookmarks/trash empties trash" {
    Invoke-RestMethod "$base/api/bookmarks/trash" -Method Delete -WebSession $session | Out-Null
    $r = Invoke-RestMethod "$base/api/bookmarks" -WebSession $session
    @($r).Count -eq 2  # bm-3 was trashed, should be gone
}

Test "DELETE /api/bookmarks/:id deletes specific bookmark" {
    $r = Invoke-RestMethod "$base/api/bookmarks/bm-2" -Method Delete -WebSession $session
    $r.ok -eq $true
}

Test "DELETE /api/bookmarks/:id 404 for already deleted" {
    try { Invoke-RestMethod "$base/api/bookmarks/bm-2" -Method Delete -WebSession $session; $false } catch { $_.Exception.Response.StatusCode -eq 404 }
}

Test "GET /api/bookmarks returns 1 bookmark after deletions" {
    $r = Invoke-RestMethod "$base/api/bookmarks" -WebSession $session
    @($r).Count -eq 1 -and $r.id -eq "bm-1"
}

# ── COLLECTIONS CRUD ─────────────────────────────────────────────────────────
Write-Host "`n[Collections CRUD]" -ForegroundColor Cyan

Test "GET /api/collections returns empty initially" {
    $r = Invoke-RestMethod "$base/api/collections" -WebSession $session
    @($r).Count -eq 0
}

Test "POST /api/collections creates a collection" {
    $body = '{"id":"col-1","name":"Dev Tools","icon":"code","color":"#3b82f6","isSystem":false}'
    $r = Invoke-RestMethod "$base/api/collections" -Method Post -ContentType "application/json" -Body $body -WebSession $session
    $r.id -eq "col-1" -and $r.name -eq "Dev Tools"
}

Test "POST /api/collections creates a second collection" {
    $body = '{"id":"col-2","name":"Reading","icon":"book","color":"#22c55e","isSystem":false}'
    $r = Invoke-RestMethod "$base/api/collections" -Method Post -ContentType "application/json" -Body $body -WebSession $session
    $r.id -eq "col-2"
}

Test "PUT /api/collections/:id updates name and color" {
    $r = Invoke-RestMethod "$base/api/collections/col-1" -Method Put -ContentType "application/json" -Body '{"name":"Developer Tools","color":"#8b5cf6"}' -WebSession $session
    $r.name -eq "Developer Tools" -and $r.color -eq "#8b5cf6"
}

Test "DELETE /api/collections/:id moves bookmarks to unsorted" {
    # bm-1 is currently in col-1
    Invoke-RestMethod "$base/api/collections/col-1" -Method Delete -WebSession $session | Out-Null
    $bm = Invoke-RestMethod "$base/api/bookmarks" -WebSession $session
    $bm.collectionId -eq "unsorted"
}

Test "GET /api/collections returns 1 after deletion" {
    $r = Invoke-RestMethod "$base/api/collections" -WebSession $session
    @($r).Count -eq 1 -and $r.id -eq "col-2"
}

# ── TAGS CRUD ────────────────────────────────────────────────────────────────
Write-Host "`n[Tags CRUD]" -ForegroundColor Cyan

Test "GET /api/tags returns empty initially" {
    $r = Invoke-RestMethod "$base/api/tags" -WebSession $session
    @($r).Count -eq 0
}

Test "POST /api/tags creates a tag" {
    $body = '{"id":"tag-A","name":"rust","color":"#ef4444"}'
    $r = Invoke-RestMethod "$base/api/tags" -Method Post -ContentType "application/json" -Body $body -WebSession $session
    $r.id -eq "tag-A" -and $r.name -eq "rust"
}

Test "POST /api/tags creates a second tag" {
    $body = '{"id":"tag-B","name":"web","color":"#3b82f6"}'
    $r = Invoke-RestMethod "$base/api/tags" -Method Post -ContentType "application/json" -Body $body -WebSession $session
    $r.id -eq "tag-B"
}

Test "PUT /api/tags/:id updates tag" {
    $r = Invoke-RestMethod "$base/api/tags/tag-A" -Method Put -ContentType "application/json" -Body '{"name":"Rust Lang","color":"#f97316"}' -WebSession $session
    $r.name -eq "Rust Lang" -and $r.color -eq "#f97316"
}

Test "DELETE /api/tags/:id removes tag from bookmarks (cascade)" {
    # bm-1 has tags ["tag-A", "tag-B"]
    Invoke-RestMethod "$base/api/tags/tag-A" -Method Delete -WebSession $session | Out-Null
    $bm = Invoke-RestMethod "$base/api/bookmarks" -WebSession $session
    @($bm.tags).Count -eq 1 -and $bm.tags[0] -eq "tag-B"
}

Test "DELETE /api/tags/:id 404 for nonexistent" {
    try { Invoke-RestMethod "$base/api/tags/nonexistent" -Method Delete -WebSession $session; $false } catch { $_.Exception.Response.StatusCode -eq 404 }
}

# ── RATE LIMITING ────────────────────────────────────────────────────────────
Write-Host "`n[Rate Limiting]" -ForegroundColor Cyan

Test "Login rate limiter blocks after 5 failed attempts" {
    $blocked = $false
    for ($i = 0; $i -lt 6; $i++) {
        try {
            Invoke-WebRequest "$base/api/auth/login" -Method Post -ContentType "application/json" -Body '{"password":"wrong"}' -UseBasicParsing
        } catch {
            if ($_.Exception.Response.StatusCode -eq 429) { $blocked = $true; break }
        }
    }
    $blocked
}

# ── LOGOUT ───────────────────────────────────────────────────────────────────
Write-Host "`n[Logout]" -ForegroundColor Cyan

Test "POST /api/auth/logout clears session" {
    $r = Invoke-WebRequest "$base/api/auth/logout" -Method Post -WebSession $session -UseBasicParsing
    $r.Headers["Set-Cookie"] -match "Max-Age=0"
}

Test "GET /api/auth/session returns false after logout" {
    $r = Invoke-RestMethod "$base/api/auth/session" -WebSession $session
    $r.authenticated -eq $false
}

Test "Protected endpoints reject after logout" {
    try { Invoke-RestMethod "$base/api/bookmarks" -WebSession $session; $false } catch { $_.Exception.Response.StatusCode -eq 401 }
}

# ── SUMMARY ──────────────────────────────────────────────────────────────────
Write-Host "`n=============================="
Write-Host " RESULTS: $pass passed, $fail failed" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
Write-Host "=============================="
