/** @type {import('next').NextConfig} */
const nextConfig = {
  // 停用 build-time Google Fonts 伺服端下載，消除本機/代理伺服器下字型下載警告
  // 由客戶端瀏覽器透過 preconnect 與 display=swap 最佳化非同步加載
  optimizeFonts: false,
};

export default nextConfig;