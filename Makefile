
run_portainer:
	docker run -d -p 9000:9000 --name portainer -v /var/run/docker.sock:/var/run/docker.sock -v portainer_data:/data portainer/portainer
heroku_tag:
	docker tag thoxynapp/thoxyn:latest registry.heroku.com/thoxyn-1/web
heroku_push: 
	docker push registry.heroku.com/thoxyn-1/web