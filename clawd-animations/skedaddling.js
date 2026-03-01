export default {
    name: 'Skedaddling',
    label: 'skedaddling',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Speed lines (thin stretched boxes)
        this._speedLines = [];
        var lineGeo = new THREE.BoxGeometry(0.4, 0.004, 0.004);
        for (var i = 0; i < 12; i++) {
            var lMat = new THREE.MeshBasicMaterial({
                color: i % 2 === 0 ? 0xffffff : 0xaaddff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var line = new THREE.Mesh(lineGeo, lMat);
            line.visible = false;
            scene.add(line);
            this._speedLines.push({ mesh: line, life: 0, maxLife: 0, vx: 0 });
        }
        this._lineIdx = 0;

        // Dust cloud particles
        this._dust = [];
        var dustGeo = new THREE.SphereGeometry(0.04, 6, 6);
        for (var j = 0; j < 20; j++) {
            var dColors = [0xccaa77, 0xddbb88, 0xbb9966, 0xeedd99];
            var dMat = new THREE.MeshBasicMaterial({
                color: dColors[j % dColors.length], transparent: true, opacity: 0,
                depthWrite: false
            });
            var dust = new THREE.Mesh(dustGeo, dMat);
            dust.visible = false;
            scene.add(dust);
            this._dust.push({ mesh: dust, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0, growRate: 0 });
        }
        this._dustIdx = 0;
        this._lastLine = 0;
    },
    _emitDustCloud(x, y, dirX) {
        for (var i = 0; i < 5; i++) {
            var d = this._dust[this._dustIdx % this._dust.length];
            this._dustIdx++;
            d.mesh.visible = true;
            d.mesh.position.set(x + (Math.random() - 0.5) * 0.1, y - 0.1 + Math.random() * 0.1, (Math.random() - 0.5) * 0.15);
            d.vx = dirX * (0.3 + Math.random() * 0.8);
            d.vy = 0.3 + Math.random() * 0.6;
            d.vz = (Math.random() - 0.5) * 0.3;
            d.life = 0.6 + Math.random() * 0.5;
            d.maxLife = d.life;
            d.mesh.material.opacity = 0.6;
            d.mesh.scale.setScalar(0.5 + Math.random() * 0.5);
            d.growRate = 1.5 + Math.random() * 2;
        }
    },
    _emitSpeedLines(x, y, dirX) {
        for (var i = 0; i < 3; i++) {
            var l = this._speedLines[this._lineIdx % this._speedLines.length];
            this._lineIdx++;
            l.mesh.visible = true;
            l.mesh.position.set(x, y + (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.1);
            l.mesh.scale.set(1 + Math.random() * 2, 1, 1);
            l.mesh.material.opacity = 0.8;
            l.vx = dirX * (2 + Math.random() * 3);
            l.life = 0.2 + Math.random() * 0.15;
            l.maxLife = l.life;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;

        if (progress < 0.08) {
            // Startle/lean: sudden surprise, lean forward
            var t = progress / 0.08;
            model.position.set(orig.x, orig.y - t * 0.03, orig.z);
            model.rotation.z = -t * 0.15;
            model.scale.set(gs * (1 + t * 0.05), gs * (1 - t * 0.08), gs);
        } else if (progress < 0.30) {
            // ZOOM right with speed lines and dust
            var t2 = (progress - 0.08) / 0.22;
            // Ease-in curve for cartoon acceleration
            var eased = t2 * t2 * t2;
            var zoomX = orig.x + eased * 3.0;

            model.position.set(zoomX, orig.y, orig.z);
            model.rotation.z = -0.25;
            // Extreme horizontal stretch during zoom
            model.scale.set(gs * (1 + (1 - t2) * 0.3), gs * (1 - (1 - t2) * 0.1), gs);

            if (time - this._lastLine > 0.04) {
                this._emitSpeedLines(zoomX - 0.3, orig.y, -1);
                this._lastLine = time;
            }

            // Dust at start of zoom
            if (t2 < 0.2) {
                this._emitDustCloud(orig.x, orig.y, -1);
            }

            // Fade model as it goes off screen
            if (t2 > 0.7) {
                model.visible = t2 < 0.9;
            }
        } else if (progress < 0.40) {
            // Pause off-screen
            model.visible = false;
            model.position.set(orig.x + 3.0, orig.y, orig.z);
        } else if (progress < 0.60) {
            // ZOOM back from left
            var t3 = (progress - 0.40) / 0.20;
            var eased2 = 1 - Math.pow(1 - t3, 3);
            var zoomX2 = orig.x - 3.0 + eased2 * 3.0;

            model.visible = t3 > 0.1;
            model.position.set(zoomX2, orig.y, orig.z);
            model.rotation.z = 0.25;
            model.scale.set(gs * (1 + (1 - t3) * 0.3), gs * (1 - (1 - t3) * 0.1), gs);

            if (time - this._lastLine > 0.04 && t3 > 0.1) {
                this._emitSpeedLines(zoomX2 + 0.3, orig.y, 1);
                this._lastLine = time;
            }
        } else if (progress < 0.78) {
            // Skid to stop with dust cloud
            var t4 = (progress - 0.60) / 0.18;
            // Deceleration curve
            var decel = 1 - Math.pow(t4, 0.5);
            var skidX = orig.x + decel * 0.5;

            model.visible = true;
            model.position.set(skidX, orig.y - Math.sin(t4 * Math.PI) * 0.03, orig.z);
            model.rotation.z = decel * 0.2;

            // Squash at stop
            var squash = decel * 0.15;
            model.scale.set(gs * (1 + squash), gs * (1 - squash * 0.6), gs);

            // Big dust cloud at skid start
            if (t4 < 0.3) {
                this._emitDustCloud(skidX, orig.y, 1);
            }

            if (t4 < 0.2 && time - this._lastLine > 0.03) {
                this._emitSpeedLines(skidX, orig.y, 1);
                this._lastLine = time;
            }
        } else {
            // Catch breath, settle
            var t5 = (progress - 0.78) / 0.22;
            model.visible = true;
            model.position.set(orig.x, orig.y, orig.z);
            model.rotation.z = 0;

            // Panting effect: subtle scale oscillation that fades
            var pant = Math.sin(time * 6) * 0.02 * (1 - t5);
            model.scale.set(gs * (1 + pant), gs * (1 - pant), gs);
        }

        // Update speed lines
        for (var li = 0; li < this._speedLines.length; li++) {
            var sl = this._speedLines[li];
            if (sl.life <= 0) continue;
            sl.life -= delta;
            if (sl.life <= 0) { sl.mesh.visible = false; continue; }
            sl.mesh.position.x += sl.vx * delta;
            sl.mesh.material.opacity = 0.8 * (sl.life / sl.maxLife);
        }

        // Update dust particles
        for (var di = 0; di < this._dust.length; di++) {
            var dp = this._dust[di];
            if (dp.life <= 0) continue;
            dp.life -= delta;
            if (dp.life <= 0) { dp.mesh.visible = false; continue; }
            dp.mesh.position.x += dp.vx * delta;
            dp.mesh.position.y += dp.vy * delta;
            dp.mesh.position.z += dp.vz * delta;
            dp.vy -= 0.8 * delta;
            // Expand as they dissipate
            var currentS = dp.mesh.scale.x;
            dp.mesh.scale.setScalar(currentS + dp.growRate * delta);
            dp.mesh.material.opacity = 0.6 * (dp.life / dp.maxLife);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._speedLines) {
            this._speedLines.forEach(function(l) {
                scene.remove(l.mesh);
                l.mesh.geometry.dispose();
                l.mesh.material.dispose();
            });
        }
        if (this._dust) {
            this._dust.forEach(function(d) {
                scene.remove(d.mesh);
                d.mesh.geometry.dispose();
                d.mesh.material.dispose();
            });
        }
        this._speedLines = this._dust = null;
    }
};
