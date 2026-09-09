@echo off
chcp 65001 >nul
title Chay du an dat san bong
cd /d "%~dp0"

echo ============================================
echo   NEN TANG DAT SAN BONG - KHOI DONG TAT CA
echo ============================================
echo.

echo [1/4] Khoi dong PostgreSQL bang Docker...
pushd csdl
docker compose up -d
if errorlevel 1 (
  echo.
  echo   !! Docker chua chay. Hay mo Docker Desktop roi chay lai file nay.
  echo   !! Neu ban dung PostgreSQL cai san tren may thi bo qua buoc nay,
  echo   !! chi can sua DATABASE_URL trong backend\.env cho dung.
  echo.
  pause
)
popd

echo.
echo [2/4] Chuan bi file cau hinh backend...
if not exist "backend\.env" (
  copy "backend\.env.example" "backend\.env" >nul
  echo   Da tao backend\.env tu file mau - kiem tra lai DATABASE_URL neu can.
) else (
  echo   backend\.env da co san.
)

echo.
echo [3/4] Cai thu vien neu chua co ^(lan dau se hoi lau^)...
if not exist "backend\node_modules" (
  echo   Dang cai cho backend...
  pushd backend
  call npm install
  popd
)
if not exist "frontend\node_modules" (
  echo   Dang cai cho frontend...
  pushd frontend
  call npm install
  popd
)

echo.
echo [4/4] Mo backend va frontend o hai cua so rieng...
start "BACKEND - API cong 3000" cmd /k "cd /d %~dp0backend && npm run dev"
timeout /t 3 >nul
start "FRONTEND - Web cong 5173" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 8 >nul

echo.
echo Dang mo trinh duyet: http://localhost:5173
start http://localhost:5173
echo.
echo Xong! Dong cua so nay duoc, nhung phai giu hai cua so BACKEND va FRONTEND.
echo Muon dung han: dong hai cua so do, roi chay "docker compose down" trong thu muc csdl.
pause
