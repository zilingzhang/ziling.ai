export default {
    name: 'Bloviating',
    label: 'bloviating',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();
        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Giant speech bubble (sphere that inflates)
        var bubGeo = new THREE.SphereGeometry(0.15, 12, 12);
        var bubMat = new THREE.MeshBasicMaterial({
            color: 0xccddff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        this._bubble = new THREE.Mesh(bubGeo, bubMat);
        this._bubble.position.set(ox + 0.3, oy + 0.2, 0);
        this._bubble.visible = false;
        scene.add(this._bubble);

        // Speech bubble tail (small cone)
        var tailGeo = new THREE.ConeGeometry(0.04, 0.08, 4);
        var tailMat = new THREE.MeshBasicMaterial({
            color: 0xccddff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._bubTail = new THREE.Mesh(tailGeo, tailMat);
        this._bubTail.visible = false;
        scene.add(this._bubTail);

        // Hot air particles rising from model
        this._hotAir = [];
        var haGeo = new THREE.SphereGeometry(0.02, 6, 6);
        for (var i = 0; i < 20; i++) {
            var haMat = new THREE.MeshBasicMaterial({
                color: i % 2 === 0 ? 0xff8844 : 0xffaa66, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var haMesh = new THREE.Mesh(haGeo, haMat);
            haMesh.visible = false;
            scene.add(haMesh);
            this._hotAir.push({
                mesh: haMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0, baseScale: 0.5 + Math.random() * 0.8
            });
        }
        this._haIdx = 0;
        this._lastHA = 0;

        // Audience particles (lean away)
        this._audience = [];
        var audGeo = new THREE.SphereGeometry(0.03, 6, 6);
        for (var a = 0; a < 5; a++) {
            var aMat = new THREE.MeshBasicMaterial({
                color: 0x88aacc, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var aMesh = new THREE.Mesh(audGeo, aMat);
            aMesh.visible = false;
            scene.add(aMesh);
            this._audience.push({
                mesh: aMesh,
                baseX: ox + 0.6 + a * 0.1,
                baseY: oy - 0.15 + (Math.random() - 0.5) * 0.1,
                leanProgress: 0
            });
        }

        // Pop burst particles
        this._popParts = [];
        var popGeo = new THREE.BoxGeometry(0.02, 0.02, 0.02);
        for (var p = 0; p < 16; p++) {
            var popColors = [0xccddff, 0xffffff, 0xaabbee, 0xddccff];
            var pMat = new THREE.MeshBasicMaterial({
                color: popColors[p % 4], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var pMesh = new THREE.Mesh(popGeo, pMat);
            pMesh.visible = false;
            scene.add(pMesh);
            this._popParts.push({
                mesh: pMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0, vz: 0
            });
        }

        // Windbag glow
        var wbGeo = new THREE.SphereGeometry(0.3, 10, 10);
        var wbMat = new THREE.MeshBasicMaterial({
            color: 0xffcc88, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._windbagGlow = new THREE.Mesh(wbGeo, wbMat);
        this._windbagGlow.position.set(ox, oy, 0);
        scene.add(this._windbagGlow);

        this._popped = false;
    },
    _emitHotAir(x, y) {
        var ha = this._hotAir[this._haIdx % this._hotAir.length];
        this._haIdx++;
        ha.mesh.visible = true;
        ha.mesh.position.set(x + (Math.random() - 0.5) * 0.1, y, 0);
        ha.vx = (Math.random() - 0.5) * 0.3;
        ha.vy = 0.8 + Math.random() * 0.6;
        ha.life = 0.8 + Math.random() * 0.6;
        ha.maxLife = ha.life;
        ha.mesh.material.opacity = 0.6;
    },
    _popBurst(x, y) {
        for (var i = 0; i < this._popParts.length; i++) {
            var p = this._popParts[i];
            p.mesh.visible = true;
            p.mesh.position.set(x, y, 0);
            var angle = Math.random() * Math.PI * 2;
            var spd = 2 + Math.random() * 3;
            p.vx = Math.cos(angle) * spd;
            p.vy = Math.sin(angle) * spd;
            p.vz = (Math.random() - 0.5) * 1.5;
            p.life = 0.5 + Math.random() * 0.4;
            p.maxLife = p.life;
            p.mesh.material.opacity = 1.0;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        if (progress < 0.08) {
            // Phase 1: Model puffs up, pompous posture
            var t = progress / 0.08;
            var puff = 1 + t * 0.1;
            model.scale.set(gs * puff, gs * puff, gs);
            model.rotation.z = -t * 0.03;
            // Windbag glow starts
            this._windbagGlow.material.opacity = t * 0.1;
            this._windbagGlow.position.copy(model.position);
        } else if (progress < 0.30) {
            // Phase 2: Inflating, bubble appears, hot air rises
            var t2 = (progress - 0.08) / 0.22;
            var inflation = 1.1 + t2 * 0.25;
            model.scale.set(gs * inflation, gs * (inflation * 0.95), gs);
            model.rotation.z = -0.03 - t2 * 0.02;
            model.position.set(ox, oy + t2 * 0.02, oz);

            // Speech bubble inflates
            this._bubble.visible = true;
            var bubScale = t2 * 2.0;
            this._bubble.scale.setScalar(bubScale);
            this._bubble.material.opacity = 0.3 + t2 * 0.2;
            this._bubble.position.set(ox + 0.3 + t2 * 0.15, oy + 0.2 + t2 * 0.1, 0);

            // Tail
            this._bubTail.visible = true;
            this._bubTail.material.opacity = 0.3 + t2 * 0.2;
            this._bubTail.position.set(ox + 0.2, oy + 0.12, 0);
            this._bubTail.rotation.z = -0.5;

            // Hot air
            if (time - this._lastHA > 0.1) {
                this._emitHotAir(model.position.x, model.position.y + 0.15);
                this._lastHA = time;
            }

            // Audience appears
            for (var a = 0; a < this._audience.length; a++) {
                var aud = this._audience[a];
                aud.mesh.visible = true;
                aud.mesh.material.opacity = t2 * 0.6;
                aud.mesh.position.set(aud.baseX, aud.baseY, 0);
            }

            this._windbagGlow.material.opacity = 0.1 + t2 * 0.1;
            this._windbagGlow.position.copy(model.position);
            this._windbagGlow.scale.setScalar(inflation);
        } else if (progress < 0.55) {
            // Phase 3: Maximum bloviating - balloon-like, audience leans away
            var t3 = (progress - 0.30) / 0.25;
            var maxInflation = 1.35 + Math.sin(time * 3) * 0.05;
            model.scale.set(gs * maxInflation, gs * (maxInflation * 0.9), gs);
            model.position.set(ox, oy + 0.03 + Math.sin(time * 2) * 0.01, oz);
            model.rotation.z = -0.05 + Math.sin(time * 1.5) * 0.02;

            // Bubble keeps growing
            var bubScale2 = 2.0 + t3 * 1.5;
            this._bubble.scale.setScalar(bubScale2);
            this._bubble.material.opacity = 0.4 + Math.sin(time * 4) * 0.1;
            this._bubble.position.set(
                ox + 0.45 + Math.sin(time * 2) * 0.03,
                oy + 0.3 + t3 * 0.1,
                0
            );
            this._bubTail.material.opacity = 0.4;
            this._bubTail.position.set(ox + 0.25, oy + 0.15, 0);

            // Audience leans away
            for (var a2 = 0; a2 < this._audience.length; a2++) {
                var aud2 = this._audience[a2];
                aud2.leanProgress = Math.min(1, aud2.leanProgress + delta * 2);
                aud2.mesh.position.set(
                    aud2.baseX + aud2.leanProgress * 0.15,
                    aud2.baseY - aud2.leanProgress * 0.02,
                    0
                );
                aud2.mesh.material.opacity = 0.6;
            }

            // Hot air fast
            if (time - this._lastHA > 0.06) {
                this._emitHotAir(model.position.x, model.position.y + 0.15);
                this._lastHA = time;
            }

            this._windbagGlow.material.opacity = 0.2 + Math.sin(time * 3) * 0.05;
            this._windbagGlow.scale.setScalar(maxInflation * 1.2);
        } else if (progress < 0.65) {
            // Phase 4: Bubble about to pop - dangerous wobble
            var t4 = (progress - 0.55) / 0.10;
            var strainScale = 1.4 + Math.sin(time * 8) * 0.08;
            model.scale.set(gs * strainScale, gs * (strainScale * 0.85), gs);

            // Bubble wobbles dangerously
            var wobble = Math.sin(time * 12) * 0.05 * (1 + t4);
            this._bubble.scale.setScalar(3.5 + wobble * 5);
            this._bubble.material.opacity = 0.5 + Math.sin(time * 10) * 0.2;
            this._bubble.position.set(
                ox + 0.5 + wobble,
                oy + 0.35 + wobble * 0.5,
                0
            );

            // Audience flinches
            for (var a3 = 0; a3 < this._audience.length; a3++) {
                var aud3 = this._audience[a3];
                aud3.mesh.position.x = aud3.baseX + 0.15 + t4 * 0.1;
                aud3.mesh.position.y = aud3.baseY - 0.02 - Math.abs(Math.sin(time * 8 + a3)) * 0.02;
            }

            this._windbagGlow.material.opacity = 0.25 + t4 * 0.1;
        } else if (progress < 0.75) {
            // Phase 5: POP! Satisfying burst
            var t5 = (progress - 0.65) / 0.10;

            if (!this._popped) {
                this._popped = true;
                this._popBurst(this._bubble.position.x, this._bubble.position.y);
            }

            // Bubble gone
            this._bubble.visible = false;
            this._bubTail.visible = false;

            // Model rapidly deflates
            var deflation = 1.4 - t5 * 0.5;
            model.scale.set(gs * deflation, gs * (deflation * 1.1), gs);
            model.position.set(ox, oy - t5 * 0.03, oz);
            model.rotation.z = Math.sin(t5 * Math.PI * 4) * 0.1 * (1 - t5);

            // Audience relieved
            for (var a4 = 0; a4 < this._audience.length; a4++) {
                var aud4 = this._audience[a4];
                aud4.mesh.position.x = aud4.baseX + 0.25 * (1 - t5);
            }

            this._windbagGlow.material.opacity = 0.35 * (1 - t5);
        } else if (progress < 0.90) {
            // Phase 6: Deflation continues, model shrinks below normal
            var t6 = (progress - 0.75) / 0.15;
            var deflated = 0.9 + t6 * 0.1;
            model.scale.set(gs * deflated, gs * deflated, gs);
            model.position.set(ox, oy - 0.03 * (1 - t6), oz);
            model.rotation.z = 0;

            // Audience fades
            for (var a5 = 0; a5 < this._audience.length; a5++) {
                this._audience[a5].mesh.material.opacity = 0.6 * (1 - t6);
            }

            this._windbagGlow.material.opacity = 0;
        } else {
            // Phase 7: Settle back to normal
            var t7 = (progress - 0.90) / 0.10;
            model.position.copy(orig);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            for (var a6 = 0; a6 < this._audience.length; a6++) {
                this._audience[a6].mesh.visible = false;
            }
        }

        // Update hot air particles
        for (var hi = 0; hi < this._hotAir.length; hi++) {
            var ha = this._hotAir[hi];
            if (ha.life <= 0) continue;
            ha.life -= delta;
            if (ha.life <= 0) { ha.mesh.visible = false; continue; }
            ha.mesh.position.x += ha.vx * delta;
            ha.mesh.position.y += ha.vy * delta;
            ha.vy += 0.5 * delta;
            var lifeRatio = ha.life / ha.maxLife;
            ha.mesh.material.opacity = lifeRatio * 0.5;
            ha.mesh.scale.setScalar(ha.baseScale * (1 + (1 - lifeRatio) * 1.5));
        }

        // Update pop burst particles
        for (var pi = 0; pi < this._popParts.length; pi++) {
            var pp = this._popParts[pi];
            if (pp.life <= 0) continue;
            pp.life -= delta;
            if (pp.life <= 0) { pp.mesh.visible = false; continue; }
            pp.mesh.position.x += pp.vx * delta;
            pp.mesh.position.y += pp.vy * delta;
            pp.mesh.position.z += pp.vz * delta;
            pp.vy -= 2.0 * delta;
            pp.mesh.material.opacity = (pp.life / pp.maxLife) * 0.9;
            pp.mesh.rotation.x += delta * 5;
            pp.mesh.rotation.z += delta * 3;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._bubble) { scene.remove(this._bubble); this._bubble.geometry.dispose(); this._bubble.material.dispose(); }
        if (this._bubTail) { scene.remove(this._bubTail); this._bubTail.geometry.dispose(); this._bubTail.material.dispose(); }
        if (this._hotAir) { this._hotAir.forEach(function(h) { scene.remove(h.mesh); h.mesh.geometry.dispose(); h.mesh.material.dispose(); }); }
        if (this._audience) { this._audience.forEach(function(a) { scene.remove(a.mesh); a.mesh.geometry.dispose(); a.mesh.material.dispose(); }); }
        if (this._popParts) { this._popParts.forEach(function(p) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }); }
        if (this._windbagGlow) { scene.remove(this._windbagGlow); this._windbagGlow.geometry.dispose(); this._windbagGlow.material.dispose(); }
        this._bubble = this._bubTail = this._hotAir = this._audience = this._popParts = this._windbagGlow = null;
    }
};
