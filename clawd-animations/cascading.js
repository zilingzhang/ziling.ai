export default {
    name: 'Cascading',
    label: 'cascading',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Tier shelves - flat box ledges for water to bounce off
        this._tiers = [];
        var tierData = [
            { x: 0.6, y: 0.5, w: 0.5, h: 0.04 },
            { x: -0.2, y: 0.0, w: 0.6, h: 0.04 },
            { x: 0.4, y: -0.45, w: 0.55, h: 0.04 }
        ];
        for (var i = 0; i < tierData.length; i++) {
            var td = tierData[i];
            var tGeo = new THREE.BoxGeometry(td.w, td.h, 0.15);
            var tMat = new THREE.MeshBasicMaterial({
                color: 0x556677, transparent: true, opacity: 0
            });
            var tier = new THREE.Mesh(tGeo, tMat);
            tier.position.set(this._origPos.x + td.x, this._origPos.y + td.y, -0.05);
            scene.add(tier);
            this._tiers.push({ mesh: tier, data: td });
        }

        // Water drop particles
        this._drops = [];
        var dropGeo = new THREE.SphereGeometry(0.025, 5, 5);
        for (var d = 0; d < 35; d++) {
            var dMat = new THREE.MeshBasicMaterial({
                color: d % 3 === 0 ? 0x44aaff : (d % 3 === 1 ? 0x88ddff : 0x2288dd),
                transparent: true, opacity: 0
            });
            var drop = new THREE.Mesh(dropGeo, dMat);
            drop.visible = false;
            scene.add(drop);
            this._drops.push({
                mesh: drop, life: 0, maxLife: 0,
                vx: 0, vy: 0, active: false,
                bounced: 0
            });
        }
        this._dropIdx = 0;

        // Mist particles at base
        this._mist = [];
        var mistGeo = new THREE.SphereGeometry(0.08, 6, 6);
        for (var m = 0; m < 15; m++) {
            var mMat = new THREE.MeshBasicMaterial({
                color: 0xccddff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var mist = new THREE.Mesh(mistGeo, mMat);
            mist.visible = false;
            scene.add(mist);
            this._mist.push({
                mesh: mist, life: 0, maxLife: 0,
                vx: 0, vy: 0, baseSize: 0.5 + Math.random() * 0.8,
                active: false
            });
        }
        this._mistIdx = 0;

        // Splash particles for tier impacts
        this._splashes = [];
        var splGeo = new THREE.SphereGeometry(0.012, 4, 4);
        for (var s = 0; s < 12; s++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: 0xaaddff, transparent: true, opacity: 0
            });
            var spl = new THREE.Mesh(splGeo, sMat);
            spl.visible = false;
            scene.add(spl);
            this._splashes.push({
                mesh: spl, life: 0, maxLife: 0,
                vx: 0, vy: 0, active: false
            });
        }
        this._splIdx = 0;

        // Water source glow at top-right
        var srcGeo = new THREE.SphereGeometry(0.15, 8, 8);
        var srcMat = new THREE.MeshBasicMaterial({
            color: 0x66bbff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._source = new THREE.Mesh(srcGeo, srcMat);
        this._source.position.set(this._origPos.x + 0.8, this._origPos.y + 1.0, -0.05);
        scene.add(this._source);
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var intensity = 0;

        // Phase: Water source appears top (0-8%)
        if (progress < 0.08) {
            intensity = progress / 0.08;
            this._source.material.opacity = intensity * 0.4;
        }
        // Phase: First stream flows down (8-25%)
        else if (progress < 0.25) {
            intensity = 0.3 + 0.4 * ((progress - 0.08) / 0.17);
            this._source.material.opacity = 0.4;
        }
        // Phase: Cascading across tiers (25-60%)
        else if (progress < 0.60) {
            intensity = 0.7 + 0.3 * ((progress - 0.25) / 0.35);
            this._source.material.opacity = 0.3 + Math.sin(time * 3) * 0.1;
        }
        // Phase: Full waterfall with mist (60-80%)
        else if (progress < 0.80) {
            intensity = 1.0;
            this._source.material.opacity = 0.3 + Math.sin(time * 3) * 0.1;
        }
        // Phase: Water slows, mist fades (80-92%)
        else if (progress < 0.92) {
            intensity = 1.0 - ((progress - 0.80) / 0.12) * 0.8;
            this._source.material.opacity = intensity * 0.3;
        }
        // Phase: Dry (92-100%)
        else {
            intensity = Math.max(0, 0.2 - ((progress - 0.92) / 0.08) * 0.2);
            this._source.material.opacity = 0;
        }

        // Tier shelf visibility
        for (var t = 0; t < this._tiers.length; t++) {
            this._tiers[t].mesh.material.opacity = Math.min(intensity * 1.2, 0.6);
        }

        // Source glow pulsation
        this._source.scale.setScalar(1 + Math.sin(time * 4) * 0.15 * intensity);

        // Spawn water drops from source
        if (intensity > 0.2 && Math.random() < intensity * 0.5) {
            var dr = this._drops[this._dropIdx % this._drops.length];
            this._dropIdx++;
            dr.active = true;
            dr.mesh.visible = true;
            dr.mesh.position.set(
                orig.x + 0.8 + (Math.random() - 0.5) * 0.15,
                orig.y + 1.0,
                (Math.random() - 0.5) * 0.1
            );
            dr.vx = -0.3 - Math.random() * 0.4;
            dr.vy = -0.2 - Math.random() * 0.3;
            dr.life = 2.0 + Math.random() * 1.0;
            dr.maxLife = dr.life;
            dr.bounced = 0;
            dr.mesh.material.opacity = 0.7 * intensity;
        }

        // Update water drops with gravity and tier collisions
        for (var di = 0; di < this._drops.length; di++) {
            var d = this._drops[di];
            if (!d.active) continue;
            d.life -= delta;
            if (d.life <= 0) { d.active = false; d.mesh.visible = false; continue; }

            d.vy -= 3.5 * delta; // gravity
            d.mesh.position.x += d.vx * delta;
            d.mesh.position.y += d.vy * delta;

            // Check tier collisions
            if (d.bounced < 3) {
                for (var ti = 0; ti < this._tiers.length; ti++) {
                    var td = this._tiers[ti].data;
                    var tierX = orig.x + td.x;
                    var tierY = orig.y + td.y;
                    if (d.vy < 0 &&
                        d.mesh.position.y < tierY + td.h &&
                        d.mesh.position.y > tierY - td.h &&
                        d.mesh.position.x > tierX - td.w / 2 &&
                        d.mesh.position.x < tierX + td.w / 2) {
                        d.vy = 0.3 + Math.random() * 0.4;
                        d.vx += (Math.random() - 0.5) * 0.6;
                        d.bounced++;

                        // Spawn splash
                        var sp = this._splashes[this._splIdx % this._splashes.length];
                        this._splIdx++;
                        sp.active = true;
                        sp.mesh.visible = true;
                        sp.mesh.position.copy(d.mesh.position);
                        sp.vx = (Math.random() - 0.5) * 1.5;
                        sp.vy = 0.5 + Math.random() * 0.5;
                        sp.life = 0.3 + Math.random() * 0.2;
                        sp.maxLife = sp.life;
                        sp.mesh.material.opacity = 0.6;
                        break;
                    }
                }
            }

            d.mesh.material.opacity = 0.7 * (d.life / d.maxLife) * intensity;
            d.mesh.scale.setScalar(0.6 + 0.4 * (d.life / d.maxLife));
        }

        // Update splashes
        for (var si = 0; si < this._splashes.length; si++) {
            var sp2 = this._splashes[si];
            if (!sp2.active) continue;
            sp2.life -= delta;
            if (sp2.life <= 0) { sp2.active = false; sp2.mesh.visible = false; continue; }
            sp2.mesh.position.x += sp2.vx * delta;
            sp2.mesh.position.y += sp2.vy * delta;
            sp2.vy -= 4 * delta;
            sp2.mesh.material.opacity = 0.6 * (sp2.life / sp2.maxLife);
        }

        // Spawn mist at base during full flow
        if (intensity > 0.6 && Math.random() < intensity * 0.2) {
            var mi = this._mist[this._mistIdx % this._mist.length];
            this._mistIdx++;
            mi.active = true;
            mi.mesh.visible = true;
            mi.mesh.position.set(
                orig.x + (Math.random() - 0.5) * 0.8,
                orig.y - 0.6 + Math.random() * 0.1,
                (Math.random() - 0.5) * 0.2
            );
            mi.vx = (Math.random() - 0.5) * 0.3;
            mi.vy = 0.1 + Math.random() * 0.15;
            mi.life = 1.5 + Math.random() * 1.0;
            mi.maxLife = mi.life;
        }

        // Update mist
        for (var mi2 = 0; mi2 < this._mist.length; mi2++) {
            var ms = this._mist[mi2];
            if (!ms.active) continue;
            ms.life -= delta;
            if (ms.life <= 0) { ms.active = false; ms.mesh.visible = false; continue; }
            ms.mesh.position.x += ms.vx * delta;
            ms.mesh.position.y += ms.vy * delta;
            var mistFade = ms.life / ms.maxLife;
            ms.mesh.material.opacity = 0.15 * mistFade * intensity;
            ms.mesh.scale.setScalar(ms.baseSize * (2 - mistFade));
        }

        // Model near base, slight splash sway
        var splashSway = Math.sin(time * 3) * 0.02 * intensity;
        model.position.set(orig.x - 0.3, orig.y - 0.3, orig.z);
        model.rotation.z = splashSway;

        // Settle
        if (progress >= 0.92) {
            var settle = (progress - 0.92) / 0.08;
            model.position.set(
                orig.x - 0.3 * (1 - settle),
                orig.y - 0.3 * (1 - settle),
                orig.z
            );
            model.rotation.z = splashSway * (1 - settle);
            if (settle > 0.8) {
                model.position.copy(orig);
                model.rotation.z = 0;
            }
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._tiers) { this._tiers.forEach(function(t) { scene.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.dispose(); }); }
        if (this._drops) { this._drops.forEach(function(d) { scene.remove(d.mesh); d.mesh.geometry.dispose(); d.mesh.material.dispose(); }); }
        if (this._mist) { this._mist.forEach(function(m) { scene.remove(m.mesh); m.mesh.geometry.dispose(); m.mesh.material.dispose(); }); }
        if (this._splashes) { this._splashes.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._source) { scene.remove(this._source); this._source.geometry.dispose(); this._source.material.dispose(); }
        this._tiers = this._drops = this._mist = this._splashes = this._source = null;
    }
};
