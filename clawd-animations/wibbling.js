export default {
    name: 'Wibbling',
    label: 'wibbling',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Jelly aura (translucent sphere around model)
        var jellyGeo = new THREE.SphereGeometry(0.2, 16, 16);
        var jellyMat = new THREE.MeshBasicMaterial({
            color: 0xcc88ff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
        });
        this._jellyAura = new THREE.Mesh(jellyGeo, jellyMat);
        this._jellyAura.position.set(ox, oy, 0);
        scene.add(this._jellyAura);

        // Second translucent layer
        var jelly2Geo = new THREE.SphereGeometry(0.22, 12, 12);
        var jelly2Mat = new THREE.MeshBasicMaterial({
            color: 0xffaadd, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
        });
        this._jellyAura2 = new THREE.Mesh(jelly2Geo, jelly2Mat);
        this._jellyAura2.position.set(ox, oy, 0);
        scene.add(this._jellyAura2);

        // Poke indicators (small spheres that appear at poke points)
        this._pokes = [];
        var pokeGeo = new THREE.SphereGeometry(0.02, 6, 6);
        for (var i = 0; i < 8; i++) {
            var pMat = new THREE.MeshBasicMaterial({
                color: 0xffdd88, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var poke = new THREE.Mesh(pokeGeo, pMat);
            poke.visible = false;
            scene.add(poke);
            this._pokes.push({ mesh: poke, life: 0, maxLife: 0, x: 0, y: 0 });
        }
        this._pokeIdx = 0;

        // Wobble shed particles
        this._wobbleParts = [];
        var wGeo = new THREE.SphereGeometry(0.01, 4, 4);
        for (var j = 0; j < 25; j++) {
            var wColors = [0xcc88ff, 0xffaadd, 0xddbbff, 0xeeaaee, 0xbbaaff];
            var wMat = new THREE.MeshBasicMaterial({
                color: wColors[j % wColors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var wp = new THREE.Mesh(wGeo, wMat);
            wp.visible = false;
            scene.add(wp);
            this._wobbleParts.push({ mesh: wp, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0 });
        }
        this._wpIdx = 0;

        // Wobble state - damped oscillation system
        this._wobbles = [];
        this._wobblePhase = 0;
        this._wobbleAmp = 0;
        this._wobbleDamp = 3.0;
        this._wobbleFreq = 8.0;
        this._lastPoke = 0;
        this._pokeSchedule = [0.15, 0.25, 0.35, 0.42, 0.50, 0.58, 0.65, 0.72];
        this._pokesDone = 0;
    },
    _doPoke(ox, oy, side) {
        // Trigger a wobble
        this._wobbleAmp += 0.12;
        this._wobblePhase = 0;

        // Visual poke indicator
        var p = this._pokes[this._pokeIdx % this._pokes.length];
        this._pokeIdx++;
        p.mesh.visible = true;
        p.x = ox + side * 0.15;
        p.y = oy + (Math.random() - 0.5) * 0.1;
        p.mesh.position.set(p.x, p.y, 0.05);
        p.life = 0.3;
        p.maxLife = 0.3;
        p.mesh.material.opacity = 0.8;
    },
    _shedWobble(x, y) {
        for (var i = 0; i < 2; i++) {
            var w = this._wobbleParts[this._wpIdx % this._wobbleParts.length];
            this._wpIdx++;
            w.mesh.visible = true;
            w.mesh.position.set(x + (Math.random() - 0.5) * 0.15, y + (Math.random() - 0.5) * 0.15, 0);
            var a = Math.random() * Math.PI * 2;
            var spd = 0.3 + Math.random() * 0.8;
            w.vx = Math.cos(a) * spd;
            w.vy = Math.sin(a) * spd;
            w.vz = (Math.random() - 0.5) * 0.3;
            w.life = 0.4 + Math.random() * 0.3;
            w.maxLife = w.life;
            w.mesh.material.opacity = 0.6;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;
        var gs = this._origScale.x;

        // Update wobble physics (damped oscillation)
        this._wobblePhase += delta * this._wobbleFreq;
        this._wobbleAmp *= Math.pow(0.5, delta * this._wobbleDamp);
        if (this._wobbleAmp < 0.001) this._wobbleAmp = 0;

        var wobbleX = Math.sin(this._wobblePhase) * this._wobbleAmp;
        var wobbleY = Math.cos(this._wobblePhase * 1.3) * this._wobbleAmp * 0.7;

        if (progress < 0.08) {
            // Phase 1: Model turns gelatinous
            var t = progress / 0.08;
            this._jellyAura.material.opacity = t * 0.15;
            this._jellyAura2.material.opacity = t * 0.1;
            model.position.set(ox, oy, oz);

            // Subtle initial wobble
            model.scale.set(gs * (1 + Math.sin(time * 2) * t * 0.03), gs * (1 - Math.sin(time * 2) * t * 0.02), gs);
        } else if (progress < 0.80) {
            // Phase 2: Poke triggers wobbles
            var t2 = (progress - 0.08) / 0.72;

            // Check for scheduled pokes
            while (this._pokesDone < this._pokeSchedule.length && progress >= this._pokeSchedule[this._pokesDone]) {
                var side = this._pokesDone % 2 === 0 ? -1 : 1;
                this._doPoke(ox, oy, side);
                this._pokesDone++;
            }

            // Jelly aura
            this._jellyAura.material.opacity = 0.15 + this._wobbleAmp * 0.5;
            this._jellyAura2.material.opacity = 0.1 + this._wobbleAmp * 0.3;

            // Wobble deformation via scale oscillation
            var scaleWobbleX = 1 + wobbleX;
            var scaleWobbleY = 1 - wobbleX * 0.7; // Conservation of volume
            model.scale.set(gs * scaleWobbleX, gs * scaleWobbleY, gs);

            // Position wobble
            model.position.set(ox + wobbleX * 0.5, oy + wobbleY * 0.3, oz);
            model.rotation.z = wobbleX * 0.3;

            // Jelly auras follow with delay
            this._jellyAura.position.set(ox + wobbleX * 0.3, oy + wobbleY * 0.2, 0);
            this._jellyAura.scale.set(1 + wobbleX * 0.5, 1 - wobbleX * 0.3, 1);
            this._jellyAura2.position.set(ox + wobbleX * 0.2, oy + wobbleY * 0.15, 0);
            this._jellyAura2.scale.set(1 + wobbleX * 0.3, 1 - wobbleX * 0.2, 1);

            // Shed particles at wobble peaks
            if (Math.abs(wobbleX) > 0.05 && Math.abs(Math.sin(this._wobblePhase)) > 0.95) {
                this._shedWobble(ox + wobbleX * 2, oy);
            }
        } else {
            // Phase 3: Wobble settles, return to normal
            var t3 = (progress - 0.80) / 0.20;

            // Force wobble to decay
            this._wobbleAmp *= 0.9;

            var fadeScaleX = 1 + wobbleX * (1 - t3);
            var fadeScaleY = 1 - wobbleX * 0.7 * (1 - t3);
            model.scale.set(gs * fadeScaleX, gs * fadeScaleY, gs);
            model.position.set(ox + wobbleX * 0.5 * (1 - t3), oy + wobbleY * 0.3 * (1 - t3), oz);
            model.rotation.z = wobbleX * 0.3 * (1 - t3);

            this._jellyAura.material.opacity = 0.15 * (1 - t3);
            this._jellyAura2.material.opacity = 0.1 * (1 - t3);
            this._jellyAura.position.set(ox, oy, 0);
            this._jellyAura2.position.set(ox, oy, 0);

            if (t3 > 0.8) {
                model.scale.copy(this._origScale);
                model.position.copy(this._origPos);
                model.rotation.z = 0;
            }
        }

        // Update poke indicators
        for (var pi = 0; pi < this._pokes.length; pi++) {
            var pk = this._pokes[pi];
            if (pk.life <= 0) continue;
            pk.life -= delta;
            if (pk.life <= 0) { pk.mesh.visible = false; continue; }
            pk.mesh.material.opacity = 0.8 * (pk.life / pk.maxLife);
            pk.mesh.scale.setScalar(1 + (1 - pk.life / pk.maxLife) * 2);
        }

        // Update shed particles
        for (var wi = 0; wi < this._wobbleParts.length; wi++) {
            var wp = this._wobbleParts[wi];
            if (wp.life <= 0) continue;
            wp.life -= delta;
            if (wp.life <= 0) { wp.mesh.visible = false; continue; }
            wp.mesh.position.x += wp.vx * delta;
            wp.mesh.position.y += wp.vy * delta;
            wp.mesh.position.z += wp.vz * delta;
            wp.mesh.material.opacity = 0.6 * (wp.life / wp.maxLife);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._jellyAura) { scene.remove(this._jellyAura); this._jellyAura.geometry.dispose(); this._jellyAura.material.dispose(); }
        if (this._jellyAura2) { scene.remove(this._jellyAura2); this._jellyAura2.geometry.dispose(); this._jellyAura2.material.dispose(); }
        if (this._pokes) {
            this._pokes.forEach(function(p) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); });
        }
        if (this._wobbleParts) {
            this._wobbleParts.forEach(function(w) { scene.remove(w.mesh); w.mesh.geometry.dispose(); w.mesh.material.dispose(); });
        }
        this._jellyAura = this._jellyAura2 = this._pokes = this._wobbleParts = null;
    }
};
