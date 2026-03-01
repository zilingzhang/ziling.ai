export default {
    name: 'Zigzagging',
    label: 'zigzagging',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Define 8 zigzag waypoints
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        this._waypoints = [
            { x: ox + 0.5, y: oy + 0.3 },
            { x: ox - 0.4, y: oy + 0.1 },
            { x: ox + 0.6, y: oy - 0.1 },
            { x: ox - 0.5, y: oy - 0.2 },
            { x: ox + 0.3, y: oy + 0.25 },
            { x: ox - 0.6, y: oy + 0.15 },
            { x: ox + 0.4, y: oy - 0.15 },
            { x: ox - 0.3, y: oy + 0.05 }
        ];

        // Ghost after-image spheres at turn points
        this._ghosts = [];
        var ghostGeo = new THREE.SphereGeometry(0.08, 8, 8);
        for (var i = 0; i < 8; i++) {
            var gMat = new THREE.MeshBasicMaterial({
                color: 0x00ffff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var ghost = new THREE.Mesh(ghostGeo, gMat);
            ghost.visible = false;
            scene.add(ghost);
            this._ghosts.push({ mesh: ghost, activated: false, fadeTime: 0 });
        }

        // Electric trail line segments connecting visited points
        this._trailLines = [];
        for (var j = 0; j < 8; j++) {
            var trailMat = new THREE.MeshBasicMaterial({
                color: 0x00eeff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            // Create a thin box that will be positioned/rotated as a line segment
            var trailGeo = new THREE.BoxGeometry(1, 0.008, 0.008);
            var trail = new THREE.Mesh(trailGeo, trailMat);
            trail.visible = false;
            scene.add(trail);
            this._trailLines.push({ mesh: trail, activated: false });
        }

        // Electric glow particles along trail
        this._elecParticles = [];
        var elecGeo = new THREE.SphereGeometry(0.012, 4, 4);
        for (var k = 0; k < 15; k++) {
            var eMat = new THREE.MeshBasicMaterial({
                color: k % 2 === 0 ? 0x00ffff : 0x44aaff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var elec = new THREE.Mesh(elecGeo, eMat);
            elec.visible = false;
            scene.add(elec);
            this._elecParticles.push({ mesh: elec, life: 0, maxLife: 0, vx: 0, vy: 0 });
        }
        this._elecIdx = 0;
        this._currentWaypoint = 0;
        this._lastElec = 0;
    },
    _positionTrailLine(index, x1, y1, x2, y2) {
        var trail = this._trailLines[index];
        var dx = x2 - x1;
        var dy = y2 - y1;
        var len = Math.sqrt(dx * dx + dy * dy);
        var angle = Math.atan2(dy, dx);

        trail.mesh.visible = true;
        trail.mesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
        trail.mesh.rotation.z = angle;
        trail.mesh.scale.x = len;
        trail.mesh.material.opacity = 0.6;
        trail.activated = true;
    },
    _emitElectric(x, y) {
        var e = this._elecParticles[this._elecIdx % this._elecParticles.length];
        this._elecIdx++;
        e.mesh.visible = true;
        e.mesh.position.set(x + (Math.random() - 0.5) * 0.05, y + (Math.random() - 0.5) * 0.05, 0);
        e.vx = (Math.random() - 0.5) * 1.5;
        e.vy = (Math.random() - 0.5) * 1.5;
        e.life = 0.2 + Math.random() * 0.3;
        e.maxLife = e.life;
        e.mesh.material.opacity = 1.0;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;
        var wps = this._waypoints;

        if (progress < 0.10) {
            // First zig: move toward first waypoint
            var t = progress / 0.10;
            var tx = orig.x + (wps[0].x - orig.x) * t;
            var ty = orig.y + (wps[0].y - orig.y) * t;
            model.position.set(tx, ty, orig.z);
            model.rotation.z = Math.atan2(wps[0].y - orig.y, wps[0].x - orig.x) * 0.3 * t;

            if (t > 0.9 && !this._ghosts[0].activated) {
                this._ghosts[0].mesh.visible = true;
                this._ghosts[0].mesh.position.set(wps[0].x, wps[0].y, 0);
                this._ghosts[0].mesh.material.opacity = 0.7;
                this._ghosts[0].activated = true;
                this._ghosts[0].fadeTime = time;
                this._positionTrailLine(0, orig.x, orig.y, wps[0].x, wps[0].y);
                this._currentWaypoint = 1;
            }
        } else if (progress < 0.65) {
            // Rapid zigzag pattern through waypoints 1-5
            var t2 = (progress - 0.10) / 0.55;
            var totalSegs = 5;
            var segProgress = t2 * totalSegs;
            var segIdx = Math.min(Math.floor(segProgress), totalSegs - 1);
            var segT = segProgress - segIdx;

            var fromWp = segIdx === 0 ? wps[0] : wps[segIdx];
            var toWp = wps[segIdx + 1];

            if (toWp) {
                var mx = fromWp.x + (toWp.x - fromWp.x) * segT;
                var my = fromWp.y + (toWp.y - fromWp.y) * segT;
                model.position.set(mx, my, orig.z);

                var moveAngle = Math.atan2(toWp.y - fromWp.y, toWp.x - fromWp.x);
                model.rotation.z = moveAngle * 0.2;

                // Activate ghost and trail when reaching a waypoint
                var wpIdx = segIdx + 1;
                if (segT > 0.9 && wpIdx < this._ghosts.length && !this._ghosts[wpIdx].activated) {
                    this._ghosts[wpIdx].mesh.visible = true;
                    this._ghosts[wpIdx].mesh.position.set(toWp.x, toWp.y, 0);
                    this._ghosts[wpIdx].mesh.material.opacity = 0.7;
                    this._ghosts[wpIdx].activated = true;
                    this._ghosts[wpIdx].fadeTime = time;

                    if (wpIdx < this._trailLines.length) {
                        this._positionTrailLine(wpIdx, fromWp.x, fromWp.y, toWp.x, toWp.y);
                    }
                    this._currentWaypoint = wpIdx + 1;
                }

                // Emit electric particles along path
                if (time - this._lastElec > 0.06) {
                    this._emitElectric(mx, my);
                    this._lastElec = time;
                }
            }
        } else if (progress < 0.82) {
            // Tighter zigzags through remaining waypoints
            var t3 = (progress - 0.65) / 0.17;
            var tightSegs = 2;
            var tSegP = t3 * tightSegs;
            var tSegIdx = Math.min(Math.floor(tSegP), tightSegs - 1);
            var tSegT = tSegP - tSegIdx;

            var fromIdx = 6 + tSegIdx;
            var toIdx = 6 + tSegIdx + 1;
            if (fromIdx < wps.length && toIdx <= wps.length) {
                var fwp = wps[Math.min(fromIdx, wps.length - 1)];
                var twp = toIdx < wps.length ? wps[toIdx] : { x: orig.x, y: orig.y };

                var mx2 = fwp.x + (twp.x - fwp.x) * tSegT;
                var my2 = fwp.y + (twp.y - fwp.y) * tSegT;
                model.position.set(mx2, my2, orig.z);
                model.rotation.z = Math.sin(time * 12) * 0.15;

                if (tSegT > 0.9 && fromIdx < this._ghosts.length && !this._ghosts[fromIdx].activated) {
                    this._ghosts[fromIdx].mesh.visible = true;
                    this._ghosts[fromIdx].mesh.position.set(fwp.x, fwp.y, 0);
                    this._ghosts[fromIdx].mesh.material.opacity = 0.7;
                    this._ghosts[fromIdx].activated = true;
                    this._ghosts[fromIdx].fadeTime = time;
                }

                if (time - this._lastElec > 0.04) {
                    this._emitElectric(mx2, my2);
                    this._lastElec = time;
                }
            }
        } else if (progress < 0.92) {
            // Return to center
            var t4 = (progress - 0.82) / 0.10;
            var curX = model.position.x;
            var curY = model.position.y;
            model.position.set(
                curX + (orig.x - curX) * t4 * 0.3,
                curY + (orig.y - curY) * t4 * 0.3,
                orig.z
            );
            model.rotation.z = model.rotation.z * (1 - t4 * 0.3);

            // Pulse all trail lines and ghosts
            var pulse = 0.5 + Math.sin(time * 8) * 0.3;
            for (var pi = 0; pi < this._trailLines.length; pi++) {
                if (this._trailLines[pi].activated) {
                    this._trailLines[pi].mesh.material.opacity = pulse * (1 - t4);
                }
            }
            for (var gi = 0; gi < this._ghosts.length; gi++) {
                if (this._ghosts[gi].activated) {
                    this._ghosts[gi].mesh.material.opacity = pulse * 0.5 * (1 - t4);
                    this._ghosts[gi].mesh.scale.setScalar(1 + Math.sin(time * 6 + gi) * 0.1);
                }
            }
        } else {
            // Rest
            model.position.copy(orig);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            // Hide everything
            for (var hi = 0; hi < this._trailLines.length; hi++) {
                this._trailLines[hi].mesh.visible = false;
            }
            for (var hj = 0; hj < this._ghosts.length; hj++) {
                this._ghosts[hj].mesh.visible = false;
            }
        }

        // Gently fade ghosts over time
        for (var fi = 0; fi < this._ghosts.length; fi++) {
            var gh = this._ghosts[fi];
            if (!gh.activated || !gh.mesh.visible) continue;
            if (progress < 0.82) {
                var age = time - gh.fadeTime;
                gh.mesh.material.opacity = Math.max(0.2, 0.7 - age * 0.1);
                gh.mesh.scale.setScalar(1 + Math.sin(time * 5 + fi) * 0.08);
            }
        }

        // Pulse trail lines gently
        for (var ti = 0; ti < this._trailLines.length; ti++) {
            var tl = this._trailLines[ti];
            if (!tl.activated || !tl.mesh.visible) continue;
            if (progress < 0.82) {
                tl.mesh.material.opacity = 0.4 + Math.sin(time * 4 + ti * 0.5) * 0.2;
            }
        }

        // Update electric particles
        for (var ei = 0; ei < this._elecParticles.length; ei++) {
            var ep = this._elecParticles[ei];
            if (ep.life <= 0) continue;
            ep.life -= delta;
            if (ep.life <= 0) { ep.mesh.visible = false; continue; }
            ep.mesh.position.x += ep.vx * delta;
            ep.mesh.position.y += ep.vy * delta;
            ep.mesh.material.opacity = (ep.life / ep.maxLife) * 0.8;
            // Jitter
            ep.mesh.position.x += (Math.random() - 0.5) * 0.01;
            ep.mesh.position.y += (Math.random() - 0.5) * 0.01;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._ghosts) {
            this._ghosts.forEach(function(g) {
                scene.remove(g.mesh);
                g.mesh.geometry.dispose();
                g.mesh.material.dispose();
            });
        }
        if (this._trailLines) {
            this._trailLines.forEach(function(t) {
                scene.remove(t.mesh);
                t.mesh.geometry.dispose();
                t.mesh.material.dispose();
            });
        }
        if (this._elecParticles) {
            this._elecParticles.forEach(function(e) {
                scene.remove(e.mesh);
                e.mesh.geometry.dispose();
                e.mesh.material.dispose();
            });
        }
        this._ghosts = this._trailLines = this._elecParticles = this._waypoints = null;
    }
};
