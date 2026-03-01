export default {
    name: 'Schlepping',
    label: 'schlepping',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Heavy box (cube) on model's back
        var boxGeo = new THREE.BoxGeometry(0.2, 0.15, 0.15);
        var boxMat = new THREE.MeshBasicMaterial({
            color: 0x886655, transparent: true, opacity: 0,
            depthWrite: false
        });
        this._box = new THREE.Mesh(boxGeo, boxMat);
        this._box.position.set(ox, oy + 0.15, 0);
        scene.add(this._box);

        // Box label lines (decorative stripes)
        this._stripes = [];
        for (var s = 0; s < 3; s++) {
            var stGeo = new THREE.BoxGeometry(0.18, 0.008, 0.16);
            var stMat = new THREE.MeshBasicMaterial({
                color: 0x665544, transparent: true, opacity: 0,
                depthWrite: false
            });
            var stripe = new THREE.Mesh(stGeo, stMat);
            stripe.position.set(ox, oy + 0.1 + s * 0.04, 0.08);
            scene.add(stripe);
            this._stripes.push(stripe);
        }

        // Sweat particles
        this._sweatParts = [];
        var sweatGeo = new THREE.SphereGeometry(0.012, 4, 4);
        for (var i = 0; i < 15; i++) {
            var swMat = new THREE.MeshBasicMaterial({
                color: i % 2 === 0 ? 0x88bbdd : 0x99ccee, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var sw = new THREE.Mesh(sweatGeo, swMat);
            sw.visible = false;
            scene.add(sw);
            this._sweatParts.push({ mesh: sw, life: 0, maxLife: 0, vx: 0, vy: 0 });
        }
        this._sweatIdx = 0;

        // Dust burst particles (for dropping load)
        this._dustParts = [];
        var dustGeo = new THREE.SphereGeometry(0.025, 6, 6);
        for (var j = 0; j < 20; j++) {
            var dColors = [0xbbaa88, 0xccbb99, 0xaa9977, 0xddccaa];
            var dMat = new THREE.MeshBasicMaterial({
                color: dColors[j % dColors.length], transparent: true, opacity: 0,
                depthWrite: false
            });
            var dust = new THREE.Mesh(dustGeo, dMat);
            dust.visible = false;
            scene.add(dust);
            this._dustParts.push({ mesh: dust, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0, grow: 0 });
        }
        this._dustIdx = 0;

        // Relief glow
        var reliefGeo = new THREE.SphereGeometry(0.3, 12, 12);
        var reliefMat = new THREE.MeshBasicMaterial({
            color: 0x88bbdd, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._reliefGlow = new THREE.Mesh(reliefGeo, reliefMat);
        this._reliefGlow.position.set(ox, oy, 0);
        scene.add(this._reliefGlow);

        this._lastSweat = 0;
        this._dropDone = false;
        this._startX = ox - 0.5;
        this._endX = ox + 0.4;
    },
    _emitSweat(x, y) {
        var s = this._sweatParts[this._sweatIdx % this._sweatParts.length];
        this._sweatIdx++;
        s.mesh.visible = true;
        s.mesh.position.set(x + (Math.random() - 0.5) * 0.08, y + 0.08, 0);
        s.vx = (Math.random() - 0.5) * 0.5;
        s.vy = 0.5 + Math.random() * 0.5;
        s.life = 0.4 + Math.random() * 0.3;
        s.maxLife = s.life;
        s.mesh.material.opacity = 0.7;
    },
    _emitDustBurst(x, y) {
        for (var i = 0; i < 10; i++) {
            var d = this._dustParts[this._dustIdx % this._dustParts.length];
            this._dustIdx++;
            d.mesh.visible = true;
            d.mesh.position.set(x + (Math.random() - 0.5) * 0.15, y - 0.1, (Math.random() - 0.5) * 0.1);
            var a = Math.random() * Math.PI;
            var spd = 1.0 + Math.random() * 2.0;
            d.vx = Math.cos(a) * spd;
            d.vy = Math.sin(a) * spd * 0.5;
            d.vz = (Math.random() - 0.5) * 0.5;
            d.life = 0.6 + Math.random() * 0.4;
            d.maxLife = d.life;
            d.mesh.material.opacity = 0.5;
            d.mesh.scale.setScalar(0.5);
            d.grow = 2.0 + Math.random() * 1.5;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;
        var gs = this._origScale.x;

        if (progress < 0.06) {
            // Phase 1: Box appears, loads onto model
            var t = progress / 0.06;
            this._box.material.opacity = t * 0.7;
            for (var si = 0; si < this._stripes.length; si++) {
                this._stripes[si].material.opacity = t * 0.5;
            }
            model.position.set(this._startX, oy, oz);
            this._box.position.set(this._startX, oy + 0.15, 0);
            for (var sj = 0; sj < this._stripes.length; sj++) {
                this._stripes[sj].position.set(this._startX, oy + 0.1 + sj * 0.04, 0.08);
            }
        } else if (progress < 0.72) {
            // Phase 2: Trudging forward with periodic rest stops
            var t2 = (progress - 0.06) / 0.66;

            // Calculate position with rest stops
            var restPoints = [0.25, 0.55]; // progress points for rest
            var isResting = false;
            for (var ri = 0; ri < restPoints.length; ri++) {
                var restP = (restPoints[ri] - 0.06) / 0.66;
                if (Math.abs(t2 - restP) < 0.05) {
                    isResting = true;
                }
            }

            var walkX = this._startX + t2 * (this._endX - this._startX);

            if (isResting) {
                // Rest stop: model pauses, box settles
                model.position.set(walkX, oy, oz);
                model.rotation.z = 0;
                model.scale.set(gs, gs * 0.97, gs);
                this._box.position.set(walkX, oy + 0.13, 0);
            } else {
                // Trudging: lean forward, slow bob
                var stepPhase = Math.sin(time * 3);
                var lean = -0.12;
                var bob = Math.abs(stepPhase) * 0.015;

                model.position.set(walkX, oy - 0.02 + bob, oz);
                model.rotation.z = lean + Math.sin(time * 3) * 0.02;
                // Compressed under weight
                model.scale.set(gs * 1.03, gs * 0.95, gs);

                // Box bobs with model
                this._box.position.set(walkX + 0.02, oy + 0.12 + bob * 0.5, 0);
                this._box.rotation.z = Math.sin(time * 2) * 0.03;

                // Strain wobble
                this._box.rotation.x = Math.sin(time * 5) * 0.02;
            }

            // Stripes follow box
            for (var sk = 0; sk < this._stripes.length; sk++) {
                this._stripes[sk].position.set(this._box.position.x, this._box.position.y - 0.02 + sk * 0.04, 0.08);
                this._stripes[sk].rotation.z = this._box.rotation.z;
            }

            // Sweat particles
            if (time - this._lastSweat > 0.3 && !isResting) {
                this._emitSweat(walkX, oy);
                this._lastSweat = time;
            }

            this._box.material.opacity = 0.7;
        } else if (progress < 0.82) {
            // Phase 3: Arrive! Drop the load
            var t3 = (progress - 0.72) / 0.10;

            if (!this._dropDone) {
                this._emitDustBurst(this._endX, oy);
                this._dropDone = true;
            }

            // Box falls off
            var dropY = oy + 0.12 - t3 * 0.25;
            this._box.position.set(this._endX + t3 * 0.15, dropY, 0);
            this._box.rotation.z = t3 * 0.5;

            for (var sl = 0; sl < this._stripes.length; sl++) {
                this._stripes[sl].position.set(this._endX + t3 * 0.15, dropY - 0.02 + sl * 0.04, 0.08);
                this._stripes[sl].rotation.z = t3 * 0.5;
            }

            // Model springs up with relief
            model.position.set(this._endX, oy + Math.sin(t3 * Math.PI) * 0.1, oz);
            model.rotation.z = 0;
            model.scale.set(gs * (1 - (1 - t3) * 0.03), gs * (1 + t3 * 0.05), gs);
        } else {
            // Phase 4: Relief glow, fade
            var t4 = (progress - 0.82) / 0.18;

            this._reliefGlow.material.opacity = Math.sin(t4 * Math.PI) * 0.2;
            this._reliefGlow.position.set(this._endX, oy, 0);
            this._reliefGlow.scale.setScalar(1 + t4 * 0.5);

            // Box and stripes fade
            this._box.material.opacity = 0.7 * (1 - t4);
            for (var sm = 0; sm < this._stripes.length; sm++) {
                this._stripes[sm].material.opacity = 0.5 * (1 - t4);
            }

            model.position.set(this._endX + (ox - this._endX) * t4, oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update sweat particles
        for (var swi = 0; swi < this._sweatParts.length; swi++) {
            var sw = this._sweatParts[swi];
            if (sw.life <= 0) continue;
            sw.life -= delta;
            if (sw.life <= 0) { sw.mesh.visible = false; continue; }
            sw.mesh.position.x += sw.vx * delta;
            sw.mesh.position.y += sw.vy * delta;
            sw.mesh.material.opacity = 0.7 * (sw.life / sw.maxLife);
            sw.mesh.scale.setScalar(0.6 + 0.4 * (1 - sw.life / sw.maxLife));
        }

        // Update dust particles
        for (var di = 0; di < this._dustParts.length; di++) {
            var dp = this._dustParts[di];
            if (dp.life <= 0) continue;
            dp.life -= delta;
            if (dp.life <= 0) { dp.mesh.visible = false; continue; }
            dp.mesh.position.x += dp.vx * delta;
            dp.mesh.position.y += dp.vy * delta;
            dp.mesh.position.z += dp.vz * delta;
            dp.vy -= 1.0 * delta;
            var cs = dp.mesh.scale.x + dp.grow * delta;
            dp.mesh.scale.setScalar(cs);
            dp.mesh.material.opacity = 0.5 * (dp.life / dp.maxLife);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._box) { scene.remove(this._box); this._box.geometry.dispose(); this._box.material.dispose(); }
        if (this._stripes) {
            this._stripes.forEach(function(s) { scene.remove(s); s.geometry.dispose(); s.material.dispose(); });
        }
        if (this._sweatParts) {
            this._sweatParts.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); });
        }
        if (this._dustParts) {
            this._dustParts.forEach(function(d) { scene.remove(d.mesh); d.mesh.geometry.dispose(); d.mesh.material.dispose(); });
        }
        if (this._reliefGlow) { scene.remove(this._reliefGlow); this._reliefGlow.geometry.dispose(); this._reliefGlow.material.dispose(); }
        this._box = this._stripes = this._sweatParts = this._dustParts = this._reliefGlow = null;
    }
};
