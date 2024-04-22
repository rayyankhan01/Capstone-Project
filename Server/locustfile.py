import logging
from locust import HttpUser, task, between, events

# Set up basic logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s %(levelname)s %(message)s')


class WebsiteUser(HttpUser):
    wait_time = between(1, 5)

    @task
    def load_main_page(self):
        with self.client.get("/", catch_response=True) as response:
            if response.status_code == 200:
                logging.debug("Successfully accessed the main page.")
            else:
                logging.debug(f"Failed to load page, status code {response.status_code}")

    @task(2)
    def load_trends(self):
        self.client.get("/trends")

@events.init.add_listener
def on_locust_init(web_ui, **kw):
    @web_ui.app.errorhandler(500)
    def internal_error(error):
        logging.error(f"Server 500 error: {error}")
        return "Internal server error", 500

    @web_ui.app.errorhandler(404)
    def not_found(error):
        logging.error(f"Server 404 error: {error}")
        return "Page not found", 404