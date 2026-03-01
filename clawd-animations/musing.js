export default {
    name: 'Musing',
    label: 'musing',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Dreamy clouds (soft translucent spheres drifting by)
        this._clouds = [];
        var cloudGeo = new THREE.SphereGeometry(0.08, 8, 8);
        var pastelColors = [0xddbbff, 0xbbddff, 0xffbbdd, 0xbbffdd, 0xddffbb,
                            0xffddbb, 0xccbbee, 0xbbeedd];
        for (var i = 0; i < 8; i++) {
            var cMat = new THREE.MeshBasicMaterial({
                color: pastelColors[i],
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var cloud = new THREE.Mesh(cloudGeo, cMat);
            cloud.visible = false;
            scene.add(cloud);
            this._clouds.push({
                mesh: cloud,
                x: ox - 0.5 + Math.random() * 1.0,
                y: oy + 0.15 + Math.random() * 0.2,
                driftSpeed: 0.05 + Math.random() * 0.08,
                floatPhase: Math.random() * Math.PI * 2,
                scale: 0.6 + Math.random() * 0.8
            });
        }

        // Star-like inspiration twinkle particles (in and around clouds)
        this._twinkles = [];
        var twinkleGeo = new THREE.SphereGeometry(0.008, 5, 5);
        for (var t = 0; t < 25; t++) {
            var tMat = new THREE.MeshBasicMaterial({
                color: t % 4 === 0 ? 0xffffff : (t % 4 === 1 ? 0xffeecc : (t % 4 === 2 ? 0xccddff : 0xeeccff)),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var twinkle = new THREE.Mesh(twinkleGeo, tMat);
            twinkle.visible = false;
            scene.add(twinkle);
            this._twinkles.push({
                mesh: twinkle,
                x: ox - 0.4 + Math.random() * 0.8,
                y: oy + 0.1 + Math.random() * 0.3,
                twinkleSpeed: 2 + Math.random() * 4,
                twinklePhase: Math.random() * Math.PI * 2,
                brightness: 0.3 + Math.random() * 0.5
            });
        }

        // Bright insight flash spheres (occasional)
        this._insights = [];
        var insGeo = new THREE.SphereGeometry(0.04, 8, 8);
        for (var n = 0; n < 4; n++) {
            var insMat = new THREE.MeshBasicMaterial({
                color: 0xffffff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var ins = new THREE.Mesh(insGeo, insMat);
            ins.visible = false;
            scene.add(ins);
            this._insights.push({
                mesh: ins,
                life: 0, maxLife: 0,
                x: 0, y: 0
            });
        }
        this._insightIdx = 0;
        this._lastInsight = 0;

        // Soft ambient glow
        var glowGeo = new THREE.SphereGeometry(0.4, 12, 12);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xccbbee, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._glow = new THREE.Mesh(glowGeo, glowMat);
        this._glow.position.set(ox, oy + 0.1, -0.05);
        scene.add(this._glow);
    },
    _spawnInsight(ox, oy) {
        var ins = this._insights[this._insightIdx % this._insights.length];
        this._insightIdx++;
        ins.mesh.visible = true;
        ins.x = ox - 0.3 + Math.random() * 0.6;
        ins.y = oy + 0.1 + Math.random() * 0.25;
        ins.mesh.position.set(ins.x, ins.y, 0.04);
        ins.life = 0.3 + Math.random() * 0.4;
        ins.maxLife = ins.life;
        ins.mesh.material.opacity = 0.8;
        ins.mesh.scale.setScalar(0.5);
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        if (progress < 0.10) {
            // Phase 1: Clouds drift in, model gazes upward
            var t = progress / 0.10;
            for (var i = 0; i < this._clouds.length; i++) {
                this._clouds[i].mesh.visible = true;
                this._clouds[i].mesh.material.opacity = t * 0.25;
                this._clouds[i].mesh.scale.setScalar(this._clouds[i].scale * t);
            }
            this._glow.material.opacity = t * 0.03;

            // Model gazes up slightly
            model.position.set(ox, oy + t * 0.005, oz);
            model.rotation.z = -t * 0.02;
        } else if (progress < 0.35) {
            // Phase 2: Twinkles appear in clouds, dreamy floating
            var t2 = (progress - 0.10) / 0.25;
            this._glow.material.opacity = 0.03 + t2 * 0.04;

            // Twinkles fade in
            for (var ti = 0; ti < this._twinkles.length; ti++) {
                if (t2 > ti * 0.03) {
                    this._twinkles[ti].mesh.visible = true;
                }
            }

            model.position.set(ox, oy + 0.005 + Math.sin(time * 0.8) * 0.005, oz);
            model.rotation.z = -0.02 + Math.sin(time * 0.5) * 0.01;
        } else if (progress < 0.65) {
            // Phase 3: Full musing, occasional bright insights
            var t3 = (progress - 0.35) / 0.30;
            this._glow.material.opacity = 0.07 + Math.sin(time * 1.2) * 0.02;

            // Occasional insight flashes
            if (time - this._lastInsight > 1.8 + Math.random() * 1.5) {
                this._spawnInsight(ox, oy);
                this._lastInsight = time;
            }

            // Gentle floating motion
            model.position.set(
                ox + Math.sin(time * 0.4) * 0.005,
                oy + 0.005 + Math.sin(time * 0.7) * 0.006,
                oz
            );
            model.rotation.z = -0.02 + Math.sin(time * 0.4) * 0.015;
        } else if (progress < 0.85) {
            // Phase 4: Dreamy fade, clouds drift away
            var t4 = (progress - 0.65) / 0.20;
            this._glow.material.opacity = 0.07 * (1 - t4 * 0.5);

            for (var ci = 0; ci < this._clouds.length; ci++) {
                this._clouds[ci].mesh.material.opacity = 0.25 * (1 - t4 * 0.4);
                this._clouds[ci].driftSpeed *= 1 + delta * 0.2;
            }

            model.position.set(
                ox + Math.sin(time * 0.4) * 0.003 * (1 - t4),
                oy + 0.005 * (1 - t4),
                oz
            );
            model.rotation.z = (-0.02 + Math.sin(time * 0.4) * 0.01) * (1 - t4);
        } else {
            // Phase 5: Final fade
            var t5 = (progress - 0.85) / 0.15;
            for (var cj = 0; cj < this._clouds.length; cj++) {
                this._clouds[cj].mesh.material.opacity = 0.15 * (1 - t5);
            }
            for (var tj = 0; tj < this._twinkles.length; tj++) {
                this._twinkles[tj].mesh.material.opacity *= (1 - t5 * 0.08);
            }
            this._glow.material.opacity = 0.035 * (1 - t5);

            model.position.set(ox, oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update cloud positions (drift across)
        for (var ck = 0; ck < this._clouds.length; ck++) {
            var cl = this._clouds[ck];
            cl.x += cl.driftSpeed * delta;
            if (cl.x > ox + 0.6) cl.x = ox - 0.6;
            var floatY = Math.sin(time * 0.6 + cl.floatPhase) * 0.01;
            cl.mesh.position.set(cl.x, cl.y + floatY, 0);
        }

        // Update twinkle stars
        for (var tk = 0; tk < this._twinkles.length; tk++) {
            var tw = this._twinkles[tk];
            if (!tw.mesh.visible) continue;
            var twinkle = (Math.sin(time * tw.twinkleSpeed + tw.twinklePhase) * 0.5 + 0.5) * tw.brightness;
            tw.mesh.material.opacity = twinkle;
            tw.mesh.position.set(tw.x, tw.y + Math.sin(time * 0.5 + tk) * 0.003, 0.03);
            tw.mesh.scale.setScalar(0.5 + twinkle);
        }

        // Update insight flashes
        for (var ii = 0; ii < this._insights.length; ii++) {
            var ins = this._insights[ii];
            if (ins.life <= 0) continue;
            ins.life -= delta;
            if (ins.life <= 0) { ins.mesh.visible = false; continue; }
            var lr = ins.life / ins.maxLife;
            var flash = lr > 0.5 ? (1 - lr) / 0.5 : lr / 0.5;
            ins.mesh.material.opacity = flash * 0.8;
            ins.mesh.scale.setScalar(0.5 + (1 - lr) * 1.5);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._clouds) {
            this._clouds.forEach(function(c) {
                scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh.material.dispose();
            });
        }
        if (this._twinkles) {
            this._twinkles.forEach(function(t) {
                scene.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.dispose();
            });
        }
        if (this._insights) {
            this._insights.forEach(function(i) {
                scene.remove(i.mesh); i.mesh.geometry.dispose(); i.mesh.material.dispose();
            });
        }
        if (this._glow) { scene.remove(this._glow); this._glow.geometry.dispose(); this._glow.material.dispose(); }
        this._clouds = this._twinkles = this._insights = this._glow = null;
    }
};
