import flask
import datetime
import platform
import os
import requests

print('----------load')

app = flask.Flask(__name__)
_port = int(os.environ.get('PORT_IN', '80'))

print('----------env', _port)


@app.route('/')
def hello():
    print('----------hello')
    
    app_name = os.environ.get('APP_NAME', 'AWS ECS Flask Webpage')
    container_service = os.environ.get('CONTAINER_SERVICE', 'AWS')
    infra_version = os.environ.get('INFRA_VERSION', '0.0.0')
    python_version = platform.python_version()
    now = datetime.datetime.now()

    print('===start')
    url = 'http://{}.{}/'.format('EcsProjectDemo-EcsAlbStack', 'EcsProjectDemo-NS')
    body = requests.get(url, timeout=1).text
    print('===body', body)

    return flask.render_template('index.html',
                                 name=app_name,
                                 platform=container_service,
                                 infra_version=infra_version,
                                 flask_version=flask.__version__,
                                 python_version=python_version,
                                 time=now)


if __name__ == '__main__':
    print('----------main')
    app.run(
        debug=True,
        host='0.0.0.0',
        port=_port
    )
