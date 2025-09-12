from flask import Flask
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')

print('Registering monitoring blueprint...')
try:
    from routes.v5.monitoring_api import monitoring_v5
    app.register_blueprint(monitoring_v5)
    print(f'SUCCESS: Registered {monitoring_v5.name} with prefix {monitoring_v5.url_prefix}')
except Exception as e:
    print(f'ERROR: Failed to register monitoring blueprint: {e}')
    import traceback
    traceback.print_exc()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
