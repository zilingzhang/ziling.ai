export default {
    name: 'Crystallizing',
    label: 'crystallizing',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Seed crystal - tiny octahedron at center bottom
        var seedGeo = new THREE.OctahedronGeometry(0.05, 0);
        var seedMat = new THREE.MeshBasicMaterial({
            color: 0xaaddff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._seed = new THREE.Mesh(seedGeo, seedMat);
        this._seed.position.set(this._origPos.x, this._origPos.y - 0.25, 0.05);
        scene.add(this._seed);

        // Crystal branches - 15 octahedrons that grow outward
        this._branches = [];
        var branchColors = [0x8888ff, 0xaaccff, 0xcc88ff, 0xeeeeff, 0x9999ff,
                            0xbb99ff, 0xddddff, 0x7777ee, 0xaa77ff, 0xccbbff,
                            0x8899ff, 0xbb88ee, 0xddaaff, 0xffffff, 0x9988dd];
        for (var i = 0; i < 15; i++) {
            var bGeo = new THREE.OctahedronGeometry(0.04 + Math.random() * 0.03, 0);
            var bMat = new THREE.MeshBasicMaterial({
                color: branchColors[i],
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var branch = new THREE.Mesh(bGeo, bMat);
            branch.visible = false;
            scene.add(branch);

            // Target position relative to seed - radiate outward in a snowflake pattern
            var angle = (i / 15) * Math.PI * 2 + (i % 3) * 0.2;
            var dist = 0.15 + (i % 3) * 0.12;
            var tier = Math.floor(i / 5);
            this._branches.push({
                mesh: branch,
                targetX: this._origPos.x + Math.cos(angle) * dist,
                targetY: this._origPos.y - 0.25 + Math.sin(angle) * dist * 0.7,
                targetScale: 0.6 + Math.random() * 0.8,
                growStart: 0.08 + tier * 0.14,
                growEnd: 0.08 + tier * 0.14 + 0.12,
                rotSpeed: (Math.random() - 0.5) * 2,
                shimmerPhase: Math.random() * Math.PI * 2
            });
        }

        // Sparkle particles at growth tips
        this._sparkles = [];
        var spkGeo = new THREE.SphereGeometry(0.012, 4, 4);
        for (var k = 0; k < 20; k++) {
            var spkMat = new THREE.MeshBasicMaterial({
                color: k % 3 === 0 ? 0xffffff : (k % 3 === 1 ? 0xddccff : 0xaabbff),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var spk = new THREE.Mesh(spkGeo, spkMat);
            spk.visible = false;
            scene.add(spk);
            this._sparkles.push({
                mesh: spk,
                life: 0,
                maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._spkIdx = 0;

        // Central shimmer glow
        var shimGeo = new THREE.SphereGeometry(0.3, 16, 16);
        var shimMat = new THREE.MeshBasicMaterial({
            color: 0x8866ff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._shimmer = new THREE.Mesh(shimGeo, shimMat);
        this._shimmer.position.set(this._origPos.x, this._origPos.y - 0.25, -0.05);
        scene.add(this._shimmer);
    },
    _emitSparkle(x, y) {
        var s = this._sparkles[this._spkIdx % this._sparkles.length];
        this._spkIdx++;
        s.mesh.visible = true;
        s.mesh.position.set(x, y, 0.1);
        var a = Math.random() * Math.PI * 2;
        s.vx = Math.cos(a) * (0.3 + Math.random() * 0.5);
        s.vy = Math.sin(a) * (0.3 + Math.random() * 0.5);
        s.life = 0.3 + Math.random() * 0.3;
        s.maxLife = s.life;
        s.mesh.material.opacity = 1.0;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;

        // Seed crystal
        if (progress < 0.08) {
            var seedFade = progress / 0.08;
            this._seed.material.opacity = seedFade * 0.8;
            this._seed.scale.setScalar(seedFade * 0.8);
            this._seed.rotation.y += delta * 2;
        } else if (progress < 0.75) {
            this._seed.material.opacity = 0.8;
            this._seed.rotation.y += delta * 1.5;
            // Pulse the seed
            var seedPulse = 0.8 + Math.sin(time * 3) * 0.1;
            this._seed.scale.setScalar(seedPulse);
        } else {
            // Fade out seed with crystal
            var fadeOut = (progress - 0.75) / 0.25;
            this._seed.material.opacity = 0.8 * (1 - fadeOut);
            this._seed.rotation.y += delta * 1;
        }

        // Crystal branches - staggered growth
        for (var i = 0; i < this._branches.length; i++) {
            var b = this._branches[i];
            if (progress < b.growStart) {
                b.mesh.visible = false;
            } else if (progress < b.growEnd) {
                // Growing phase
                b.mesh.visible = true;
                var growT = (progress - b.growStart) / (b.growEnd - b.growStart);
                var eased = growT * growT * (3 - 2 * growT); // smoothstep
                b.mesh.position.set(
                    this._origPos.x + (b.targetX - this._origPos.x) * eased,
                    this._origPos.y - 0.25 + (b.targetY - (this._origPos.y - 0.25)) * eased,
                    0.05
                );
                b.mesh.scale.setScalar(b.targetScale * eased);
                b.mesh.material.opacity = eased * 0.7;
                b.mesh.rotation.y += delta * b.rotSpeed * 2;

                // Emit sparkle at growing tip
                if (Math.random() < 0.15) {
                    this._emitSparkle(b.mesh.position.x, b.mesh.position.y);
                }
            } else if (progress < 0.75) {
                // Fully grown - shimmer with color shifts
                b.mesh.visible = true;
                b.mesh.scale.setScalar(b.targetScale);
                b.mesh.material.opacity = 0.5 + Math.sin(time * 2 + b.shimmerPhase) * 0.2;
                b.mesh.rotation.y += delta * b.rotSpeed;

                // Color shift for refractive effect
                var hue = (Math.sin(time * 1.5 + b.shimmerPhase) * 0.5 + 0.5);
                var r = 0.6 + hue * 0.4;
                var g = 0.5 + (1 - hue) * 0.3;
                var bv = 0.8 + hue * 0.2;
                b.mesh.material.color.setRGB(r, g, bv);
            } else {
                // Fade out
                var branchFade = (progress - 0.75) / 0.25;
                b.mesh.material.opacity = (0.5 + Math.sin(time * 2 + b.shimmerPhase) * 0.2) * (1 - branchFade);
                b.mesh.rotation.y += delta * b.rotSpeed * 0.5;
                if (b.mesh.material.opacity < 0.01) b.mesh.visible = false;
            }
        }

        // Shimmer glow
        if (progress >= 0.08 && progress < 0.75) {
            var shimInt = Math.min(1, (progress - 0.08) / 0.20);
            this._shimmer.material.opacity = shimInt * (0.12 + Math.sin(time * 2.5) * 0.05);
            this._shimmer.scale.setScalar(1 + Math.sin(time * 1.8) * 0.15);
        } else if (progress >= 0.75) {
            var shimFade = (progress - 0.75) / 0.25;
            this._shimmer.material.opacity *= (1 - shimFade * 0.05);
        }

        // Sparkle burst at full crystal (50-60%)
        if (progress >= 0.50 && progress < 0.55 && Math.random() < 0.3) {
            var rBranch = this._branches[Math.floor(Math.random() * this._branches.length)];
            if (rBranch.mesh.visible) {
                this._emitSparkle(rBranch.mesh.position.x, rBranch.mesh.position.y);
            }
        }

        // Update sparkles
        for (var si = 0; si < this._sparkles.length; si++) {
            var sp = this._sparkles[si];
            if (sp.life <= 0) continue;
            sp.life -= delta;
            if (sp.life <= 0) { sp.mesh.visible = false; continue; }
            sp.mesh.position.x += sp.vx * delta;
            sp.mesh.position.y += sp.vy * delta;
            var lr = sp.life / sp.maxLife;
            sp.mesh.material.opacity = lr * 0.8;
            sp.mesh.scale.setScalar(0.5 + (1 - lr) * 0.5);
        }

        // Model gentle bob
        var bobIntensity = progress < 0.08 ? progress / 0.08 : (progress > 0.92 ? (1 - progress) / 0.08 : 1);
        model.position.set(orig.x, orig.y + Math.sin(time * 1.2) * 0.02 * bobIntensity, orig.z);
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._seed) { scene.remove(this._seed); this._seed.geometry.dispose(); this._seed.material.dispose(); }
        if (this._branches) {
            this._branches.forEach(function(b) {
                scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose();
            });
        }
        if (this._sparkles) {
            this._sparkles.forEach(function(s) {
                scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose();
            });
        }
        if (this._shimmer) { scene.remove(this._shimmer); this._shimmer.geometry.dispose(); this._shimmer.material.dispose(); }
        this._seed = this._branches = this._sparkles = this._shimmer = null;
    }
};
