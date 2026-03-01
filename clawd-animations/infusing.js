export default {
    name: 'Infusing',
    label: 'infusing',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Glass vessel (wireframe cylinder)
        var vesselGeo = new THREE.CylinderGeometry(0.15, 0.13, 0.35, 14);
        var vesselMat = new THREE.MeshBasicMaterial({
            color: 0xaaccee, transparent: true, opacity: 0,
            wireframe: true
        });
        this._vessel = new THREE.Mesh(vesselGeo, vesselMat);
        this._vessel.position.set(ox - 0.25, oy - 0.15, 0);
        scene.add(this._vessel);

        // Vessel solid (faint fill)
        var vesselFillGeo = new THREE.CylinderGeometry(0.14, 0.12, 0.34, 14);
        var vesselFillMat = new THREE.MeshBasicMaterial({
            color: 0x88aacc, transparent: true, opacity: 0,
            side: THREE.DoubleSide
        });
        this._vesselFill = new THREE.Mesh(vesselFillGeo, vesselFillMat);
        this._vesselFill.position.set(ox - 0.25, oy - 0.15, 0);
        scene.add(this._vesselFill);

        // Water inside vessel
        var waterGeo = new THREE.CylinderGeometry(0.12, 0.11, 0.28, 12);
        var waterMat = new THREE.MeshBasicMaterial({
            color: 0xeeeeff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        this._water = new THREE.Mesh(waterGeo, waterMat);
        this._water.position.set(ox - 0.25, oy - 0.17, 0);
        scene.add(this._water);

        // Tea bag / herb (brown sphere)
        var herbGeo = new THREE.SphereGeometry(0.04, 8, 8);
        var herbMat = new THREE.MeshBasicMaterial({
            color: 0x664422, transparent: true, opacity: 0
        });
        this._herb = new THREE.Mesh(herbGeo, herbMat);
        this._herb.position.set(ox - 0.25, oy + 0.1, 0);
        scene.add(this._herb);

        // String from herb to top
        var stringGeo = new THREE.BufferGeometry();
        var stringPos = new Float32Array([0, 0, 0, 0, 0.15, 0]);
        stringGeo.setAttribute('position', new THREE.BufferAttribute(stringPos, 3));
        var stringMat = new THREE.LineBasicMaterial({
            color: 0x998866, transparent: true, opacity: 0
        });
        this._string = new THREE.Line(stringGeo, stringMat);
        this._string.position.set(ox - 0.25, oy + 0.1, 0);
        scene.add(this._string);

        // Color spreading rings (expanding torus inside vessel)
        this._rings = [];
        for (var i = 0; i < 6; i++) {
            var rGeo = new THREE.TorusGeometry(0.01, 0.005, 6, 16);
            var rMat = new THREE.MeshBasicMaterial({
                color: 0xaa6633, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var ring = new THREE.Mesh(rGeo, rMat);
            ring.position.set(ox - 0.25, oy - 0.15, 0);
            ring.rotation.x = Math.PI * 0.5;
            ring.visible = false;
            scene.add(ring);
            this._rings.push({
                mesh: ring, life: 0, maxLife: 0,
                startRadius: 0.01
            });
        }
        this._ringIdx = 0;
        this._lastRing = 0;

        // Aromatic particles
        this._aromas = [];
        var aromaGeo = new THREE.SphereGeometry(0.015, 5, 5);
        for (var j = 0; j < 15; j++) {
            var aMat = new THREE.MeshBasicMaterial({
                color: j % 2 === 0 ? 0xddaa66 : 0xcc8844,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var aMesh = new THREE.Mesh(aromaGeo, aMat);
            aMesh.visible = false;
            scene.add(aMesh);
            this._aromas.push({
                mesh: aMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0, baseX: 0
            });
        }
        this._aromaIdx = 0;

        this._colorProgress = 0;
    },
    _spawnRing(x, y) {
        var r = this._rings[this._ringIdx % this._rings.length];
        this._ringIdx++;
        r.mesh.visible = true;
        r.mesh.position.set(x, y, 0);
        r.mesh.scale.setScalar(1);
        r.life = 1.5 + Math.random() * 0.5;
        r.maxLife = r.life;
        r.startRadius = 0.01;
        r.mesh.material.opacity = 0.4;
    },
    _spawnAroma(x, y) {
        var a = this._aromas[this._aromaIdx % this._aromas.length];
        this._aromaIdx++;
        a.mesh.visible = true;
        a.mesh.position.set(x + (Math.random() - 0.5) * 0.1, y, 0);
        a.baseX = a.mesh.position.x;
        a.vx = 0;
        a.vy = 0.2 + Math.random() * 0.2;
        a.life = 0.8 + Math.random() * 0.6;
        a.maxLife = a.life;
        a.mesh.material.opacity = 0.35;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;
        var vesselX = ox - 0.25;
        var vesselY = oy - 0.15;

        if (progress < 0.10) {
            // Phase 1: Vessel appears
            var t = progress / 0.10;
            var ease = t * t;
            this._vessel.material.opacity = ease * 0.5;
            this._vesselFill.material.opacity = ease * 0.1;
            this._water.material.opacity = ease * 0.2;
            model.position.set(ox + 0.15, oy, oz);
        } else if (progress < 0.25) {
            // Phase 2: Herb lowered into water
            var t2 = (progress - 0.10) / 0.15;
            this._vessel.material.opacity = 0.5;
            this._vesselFill.material.opacity = 0.1;
            this._water.material.opacity = 0.2;

            this._herb.material.opacity = t2 * 0.9;
            this._string.material.opacity = t2 * 0.5;

            // Lower herb into vessel
            var herbY = oy + 0.1 - t2 * 0.22;
            this._herb.position.y = herbY;
            this._string.position.y = herbY;

            model.position.set(ox + 0.15, oy - t2 * 0.02, oz);
        } else if (progress < 0.70) {
            // Phase 3: Color spreads outward, deepening gradient
            var t3 = (progress - 0.25) / 0.45;
            this._herb.position.y = oy - 0.12;
            this._string.position.y = oy - 0.12;
            this._herb.material.opacity = 0.9;
            this._string.material.opacity = 0.5;

            // Color progress deepens
            this._colorProgress = t3;

            // Water color shifts from clear to tea color
            var wr = 0.93 - t3 * 0.5;
            var wg = 0.93 - t3 * 0.4;
            var wb = 1.0 - t3 * 0.7;
            this._water.material.color.setRGB(wr, wg, wb);
            this._water.material.opacity = 0.2 + t3 * 0.3;

            // Expanding color rings
            if (time - this._lastRing > 0.6 - t3 * 0.3) {
                this._spawnRing(vesselX, oy - 0.12);
                this._lastRing = time;
            }

            // Aromatic particles rise
            if (Math.random() < 0.04 + t3 * 0.06) {
                this._spawnAroma(vesselX, oy + 0.02);
            }

            // Herb bobs gently
            this._herb.position.x = vesselX + Math.sin(time * 1.5) * 0.01;

            model.position.set(ox + 0.15, oy + Math.sin(time * 1.2) * 0.01, oz);
            model.rotation.z = Math.sin(time * 0.8) * 0.02;
        } else if (progress < 0.88) {
            // Phase 4: Full infusion, rich color
            var t4 = (progress - 0.70) / 0.18;

            // Deep rich color
            this._water.material.color.setRGB(0.43, 0.33, 0.15);
            this._water.material.opacity = 0.5 + Math.sin(time * 2) * 0.05;

            // Vessel takes on warm tint
            this._vessel.material.color.setRGB(
                0.67 + t4 * 0.15,
                0.8 - t4 * 0.1,
                0.93 - t4 * 0.3
            );

            // Continue aromas
            if (Math.random() < 0.06) {
                this._spawnAroma(vesselX, oy + 0.02);
            }

            // Occasional ring still spreading
            if (Math.random() < 0.02) {
                this._spawnRing(vesselX, oy - 0.15);
            }

            model.position.set(ox + 0.15, oy, oz);
            model.rotation.z = 0;
        } else {
            // Phase 5: Fade out
            var t5 = (progress - 0.88) / 0.12;
            this._vessel.material.opacity = 0.5 * (1 - t5);
            this._vesselFill.material.opacity = 0.1 * (1 - t5);
            this._water.material.opacity = 0.5 * (1 - t5);
            this._herb.material.opacity = 0.9 * (1 - t5);
            this._string.material.opacity = 0.5 * (1 - t5);

            model.position.set(ox + 0.15 * (1 - t5), oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update rings
        for (var ri = 0; ri < this._rings.length; ri++) {
            var rr = this._rings[ri];
            if (rr.life <= 0) continue;
            rr.life -= delta;
            if (rr.life <= 0) { rr.mesh.visible = false; continue; }
            var rlr = rr.life / rr.maxLife;
            var expand = (1 - rlr) * 10;
            rr.mesh.scale.setScalar(1 + expand);
            rr.mesh.material.opacity = rlr * 0.3;
        }

        // Update aromas
        for (var ai = 0; ai < this._aromas.length; ai++) {
            var aa = this._aromas[ai];
            if (aa.life <= 0) continue;
            aa.life -= delta;
            if (aa.life <= 0) { aa.mesh.visible = false; continue; }
            aa.mesh.position.y += aa.vy * delta;
            aa.mesh.position.x = aa.baseX + Math.sin(time * 3 + ai * 2) * 0.03;
            var alr = aa.life / aa.maxLife;
            aa.mesh.material.opacity = alr * 0.3;
            aa.mesh.scale.setScalar(0.5 + (1 - alr) * 1.2);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._vessel) { scene.remove(this._vessel); this._vessel.geometry.dispose(); this._vessel.material.dispose(); }
        if (this._vesselFill) { scene.remove(this._vesselFill); this._vesselFill.geometry.dispose(); this._vesselFill.material.dispose(); }
        if (this._water) { scene.remove(this._water); this._water.geometry.dispose(); this._water.material.dispose(); }
        if (this._herb) { scene.remove(this._herb); this._herb.geometry.dispose(); this._herb.material.dispose(); }
        if (this._string) { scene.remove(this._string); this._string.geometry.dispose(); this._string.material.dispose(); }
        if (this._rings) { this._rings.forEach(function(r) { scene.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose(); }); }
        if (this._aromas) { this._aromas.forEach(function(a) { scene.remove(a.mesh); a.mesh.geometry.dispose(); a.mesh.material.dispose(); }); }
        this._vessel = this._vesselFill = this._water = this._herb = this._string = this._rings = this._aromas = null;
    }
};
