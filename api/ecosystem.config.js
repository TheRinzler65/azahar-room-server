module.exports = {
    apps: [
        {
            name: 'azahar-api',
            script: './dist/index.js',
            cwd: '/opt/azahar/master-server/api',
            env: {
                NODE_ENV: 'production',
            },
            out_file: '/home/azahar/.pm2/logs/azahar-api-out.log',
            error_file: '/home/azahar/.pm2/logs/azahar-api-error.log',
            merge_logs: true,
        },
    ],
};