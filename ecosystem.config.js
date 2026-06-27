module.exports = {
  apps: [
    {
      name: 'signaling',
      script: '/home/ubuntu/VideoRoom/server/signaling-server/server.js',
      env: {
        ANNOUNCED_IP: '15.207.18.73',
        PORT: '4000',
        NODE_ENV: 'production',
        CLIENT_URL: 'https://videoroom.duckdns.org'
      }
    }
  ]
}
