export default {
    name: 'Orbiting',
    label: 'orbiting',
    duration: 12,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // 4 orbit ring tori (thin, visible orbit paths)
        this._orbitRings = [];
        var orbitRadii = [0.45, 0.7, 1.0, 1.35];
        var orbitColors = [0x334466, 0x2a3d5c, 0x223355, 0x1a2a44];
        for (var i = 0; i < 4; i++) {
            var orGeo = new THREE.TorusGeometry(orbitRadii[i], 0.005, 6, 48);
            var orMat = new THREE.MeshBasicMaterial({
                color: orbitColors[i], transparent: true, opacity: 0
            });
            var orMesh = new THREE.Mesh(orGeo, orMat);
            orMesh.rotation.x = Math.PI / 2.5;
            orMesh.position.copy(this._origPos);
            orMesh.visible = false;
            scene.add(orMesh);
            this._orbitRings.push({ mesh: orMesh, radius: orbitRadii[i] });
        }

        // 4 planet spheres
        this._planets = [];
        var planetSizes = [0.05, 0.08, 0.04, 0.06];
        var planetColors = [0xff4433, 0x3388ff, 0x33cc55, 0xff8833];
        var planetSpeeds = [1.2, 0.8, 1.8, 0.5];
        for (var p = 0; p < 4; p++) {
            var pGeo = new THREE.SphereGeometry(planetSizes[p], 10, 10);
            var pMat = new THREE.MeshBasicMaterial({
                color: planetColors[p], transparent: true, opacity: 0
            });
            var pMesh = new THREE.Mesh(pGeo, pMat);
            pMesh.visible = false;
            scene.add(pMesh);
            this._planets.push({
                mesh: pMesh,
                radius: orbitRadii[p],
                speed: planetSpeeds[p],
                phase: p * Math.PI * 0.5,
                size: planetSizes[p],
                eccentricity: 0.1 + p * 0.05 // Slight elliptical orbit
            });
        }

        // Gravity glow at center
        var gravGeo = new THREE.SphereGeometry(0.2, 16, 16);
        var gravMat = new THREE.MeshBasicMaterial({
            color: 0xffaa33, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._gravityGlow = new THREE.Mesh(gravGeo, gravMat);
        this._gravityGlow.position.copy(this._origPos);
        scene.add(this._gravityGlow);

        // Asteroid belt particles
        this._asteroids = [];
        var astGeo = new THREE.SphereGeometry(0.015, 4, 4);
        for (var a = 0; a < 10; a++) {
            var aMat = new THREE.MeshBasicMaterial({
                color: a % 2 === 0 ? 0x999988 : 0x887766,
                transparent: true, opacity: 0
            });
            var aMesh = new THREE.Mesh(astGeo, aMat);
            aMesh.visible = false;
            scene.add(aMesh);
            this._asteroids.push({
                mesh: aMesh,
                angle: (a / 10) * Math.PI * 2,
                radius: 0.8 + Math.random() * 0.4,
                speed: 2 + Math.random() * 1.5,
                yOffset: (Math.random() - 0.5) * 0.15,
                wobble: Math.random() * Math.PI * 2,
                active: false
            });
        }

        // Planet trail glow (small rings behind each planet)
        this._planetTrails = [];
        var trailGeo = new THREE.SphereGeometry(0.012, 4, 4);
        for (var t = 0; t < 16; t++) {
            var tMat = new THREE.MeshBasicMaterial({
                color: planetColors[t % 4], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var tMesh = new THREE.Mesh(trailGeo, tMat);
            tMesh.visible = false;
            scene.add(tMesh);
            this._planetTrails.push({
                mesh: tMesh,
                planetIdx: t % 4,
                delay: Math.floor(t / 4) * 0.1
            });
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var tilt = Math.PI / 2.5;
        var intensity = 0;
        var planetVis = 0;
        var asteroidActive = false;

        if (progress < 0.08) {
            // Phase 1: Orbit rings appear
            var p = progress / 0.08;
            intensity = p;
            for (var i = 0; i < this._orbitRings.length; i++) {
                this._orbitRings[i].mesh.visible = true;
                this._orbitRings[i].mesh.material.opacity = p * 0.3;
            }

        } else if (progress < 0.25) {
            // Phase 2: Planets spawn and begin orbiting
            var p2 = (progress - 0.08) / 0.17;
            intensity = 1;
            planetVis = p2;

            for (var sp = 0; sp < this._planets.length; sp++) {
                var spawnTime = sp * 0.25;
                if (p2 > spawnTime) {
                    this._planets[sp].mesh.visible = true;
                    var spawnFade = Math.min(1, (p2 - spawnTime) / 0.25);
                    this._planets[sp].mesh.material.opacity = spawnFade * 0.9;
                }
            }

        } else if (progress < 0.60) {
            // Phase 3: Full orbital system, different speeds
            intensity = 1;
            planetVis = 1;

            for (var fp = 0; fp < this._planets.length; fp++) {
                this._planets[fp].mesh.material.opacity = 0.9;
            }

        } else if (progress < 0.75) {
            // Phase 4: Asteroid belt crosses through
            var p4 = (progress - 0.60) / 0.15;
            intensity = 1;
            planetVis = 1;
            asteroidActive = true;

            for (var aa = 0; aa < this._asteroids.length; aa++) {
                this._asteroids[aa].active = true;
                this._asteroids[aa].mesh.visible = true;
                var astFade = p4 < 0.5 ? p4 / 0.5 : (1 - (p4 - 0.5) / 0.5);
                this._asteroids[aa].mesh.material.opacity = astFade * 0.7;
            }

        } else if (progress < 0.88) {
            // Phase 5: Orbits slow, planets align
            var p5 = (progress - 0.75) / 0.13;
            intensity = 1 - p5 * 0.5;
            planetVis = 1 - p5 * 0.3;

            // Hide asteroids
            for (var ha = 0; ha < this._asteroids.length; ha++) {
                this._asteroids[ha].mesh.visible = false;
                this._asteroids[ha].active = false;
            }

        } else {
            // Phase 6: Fade out
            var p6 = (progress - 0.88) / 0.12;
            intensity = 0.5 * (1 - p6);
            planetVis = 0.7 * (1 - p6);

            for (var fp2 = 0; fp2 < this._planets.length; fp2++) {
                this._planets[fp2].mesh.material.opacity = planetVis;
            }
            for (var fo = 0; fo < this._orbitRings.length; fo++) {
                this._orbitRings[fo].mesh.material.opacity = intensity * 0.3;
            }
        }

        // Update orbit ring opacity
        if (progress < 0.88) {
            for (var ro = 0; ro < this._orbitRings.length; ro++) {
                this._orbitRings[ro].mesh.material.opacity = intensity * 0.3;
                this._orbitRings[ro].mesh.position.copy(model.position);
            }
        }

        // Update planet positions (elliptical orbits on tilted plane)
        var slowdown = progress > 0.75 ? 1 - ((progress - 0.75) / 0.25) * 0.8 : 1;
        for (var pp = 0; pp < this._planets.length; pp++) {
            var planet = this._planets[pp];
            if (!planet.mesh.visible) continue;

            var angle = planet.phase + time * planet.speed * slowdown;
            var r = planet.radius;
            var ecc = planet.eccentricity;

            // Elliptical orbit on tilted plane
            var ox = Math.cos(angle) * r * (1 + ecc);
            var oyFlat = Math.sin(angle) * r * (1 - ecc);
            var oy = oyFlat * Math.cos(tilt);
            var oz = oyFlat * Math.sin(tilt);

            planet.mesh.position.set(
                model.position.x + ox,
                model.position.y + oy,
                oz
            );

            // Planet pulsing
            var pPulse = 1 + Math.sin(time * 3 + pp) * 0.1;
            planet.mesh.scale.setScalar(pPulse);
        }

        // Update planet trails
        for (var pt = 0; pt < this._planetTrails.length; pt++) {
            var trail = this._planetTrails[pt];
            var srcPlanet = this._planets[trail.planetIdx];
            if (srcPlanet.mesh.visible && planetVis > 0.3) {
                trail.mesh.visible = true;
                // Trail follows planet with delay
                var trailAngle = srcPlanet.phase + (time - trail.delay) * srcPlanet.speed * slowdown;
                var tr = srcPlanet.radius;
                var te = srcPlanet.eccentricity;
                var tx = Math.cos(trailAngle) * tr * (1 + te);
                var tyFlat = Math.sin(trailAngle) * tr * (1 - te);
                var ty = tyFlat * Math.cos(tilt);
                var tz = tyFlat * Math.sin(tilt);
                trail.mesh.position.set(model.position.x + tx, model.position.y + ty, tz);
                trail.mesh.material.opacity = planetVis * 0.2;
                trail.mesh.scale.setScalar(0.6);
            } else {
                trail.mesh.visible = false;
            }
        }

        // Update asteroids
        if (asteroidActive) {
            for (var ua = 0; ua < this._asteroids.length; ua++) {
                var ast = this._asteroids[ua];
                if (!ast.active) continue;
                var aAngle = ast.angle + time * ast.speed;
                var aR = ast.radius;
                ast.mesh.position.set(
                    model.position.x + Math.cos(aAngle) * aR,
                    model.position.y + Math.sin(aAngle) * aR * Math.cos(tilt) + ast.yOffset,
                    Math.sin(aAngle) * aR * Math.sin(tilt)
                );
                ast.mesh.scale.setScalar(0.7 + Math.sin(time * 5 + ast.wobble) * 0.3);
            }
        }

        // Update gravity glow
        this._gravityGlow.position.copy(model.position);
        this._gravityGlow.material.opacity = intensity * 0.12 + Math.sin(time * 2) * 0.03;
        this._gravityGlow.scale.setScalar(1 + Math.sin(time * 1.5) * 0.1);

        // Gentle model wobble as center of gravity
        model.rotation.z = Math.sin(time * 0.5) * 0.02 * intensity;
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._orbitRings) {
            this._orbitRings.forEach(function(r) { scene.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose(); });
        }
        if (this._planets) {
            this._planets.forEach(function(p) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); });
        }
        if (this._gravityGlow) { scene.remove(this._gravityGlow); this._gravityGlow.geometry.dispose(); this._gravityGlow.material.dispose(); }
        if (this._asteroids) {
            this._asteroids.forEach(function(a) { scene.remove(a.mesh); a.mesh.geometry.dispose(); a.mesh.material.dispose(); });
        }
        if (this._planetTrails) {
            this._planetTrails.forEach(function(t) { scene.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.dispose(); });
        }
        this._orbitRings = this._planets = this._gravityGlow = this._asteroids = this._planetTrails = null;
    }
};
