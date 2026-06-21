import requests

def check_url():
    url = "https://www.instagram.com/aquarelaqueiroz/"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
    }
    try:
        print("Enviando requisição anônima para o Instagram...")
        response = requests.get(url, headers=headers, allow_redirects=False, timeout=15)
        print(f"Status Code: {response.status_code}")
        print(f"Headers Location (Redirecionamento): {response.headers.get('Location', 'Nenhum')}")
    except Exception as e:
        print(f"Erro: {e}")

if __name__ == "__main__":
    check_url()
