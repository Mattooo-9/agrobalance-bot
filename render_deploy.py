import urllib.request
import json

def deploy_to_render(api_key, repo_url):
    url = "https://api.render.com/v1/blueprints"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    data = json.dumps({
        "repo": repo_url,
        "name": "agrobalance-blueprint",
        "branch": "main"
    }).encode('utf-8')
    
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            print("DEPLOY_SUCCESS:")
            print(json.dumps(res_data, indent=2))
            return res_data
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        print(f"HTTPError: {e.code} - {body}")
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None

if __name__ == "__main__":
    api_key = "rnd_IIUi6ty5HnbEo0IGvgb8hLEj04oO"
    repo_url = "https://github.com/Mattooo-9/agrobalance-bot"
    deploy_to_render(api_key, repo_url)
