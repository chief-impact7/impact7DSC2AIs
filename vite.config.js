import { defineConfig } from 'vite'

export default defineConfig({
    root: './', // 현재 폴더를 루트로 명시
    server: {
        watch: {
            usePolling: true, // WSL 환경에서 파일 변경 감지가 안 될 때 사용
        },
        host: true, // 로컬 네트워크 접속 허용
        port: 5173
    }
})