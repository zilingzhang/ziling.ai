export default {
    name: 'Conjuring',
    label: 'conjuring',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();
        var ox = this._origPos.x, oy = this._origPos.y;

        // Magic circle (torus ring below model)
        var circleGeo = new THREE.TorusGeometry(0.5, 0.03, 16, 48);
        var circleMat = new THREE.MeshBasicMaterial({
            color: 0x8844ff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
        });
        this._circle = new THREE.Mesh(circleGeo, circleMat);
        this._circle.rotation.x = Math.PI / 2;
        this._circle.position.set(ox, oy - 0.3, 0);
        scene.add(this._circle);

        // Arcane symbols (small glowing cubes orbiting the circle)
        this._symbols = [];
        var symGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
        for (var i = 0; i < 10; i++) {
            var symMat = new THREE.MeshBasicMaterial({
                color: 0xffcc33, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var sym = new THREE.Mesh(symGeo, symMat);
            sym.visible = false;
            scene.add(sym);
            this._symbols.push({
                mesh: sym,
                angle: (i / 10) * Math.PI * 2,
                speed: 1.0 + (i % 3) * 0.4,
                radius: 0.5 + (i % 2) * 0.1
            });
        }

        // Energy beam cylinders (vertical, rising from circle)
        this._beams = [];
        var beamGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.8, 6);
        for (var j = 0; j < 6; j++) {
            var beamMat = new THREE.MeshBasicMaterial({
                color: j % 2 === 0 ? 0x6644ff : 0x44aaff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var beam = new THREE.Mesh(beamGeo, beamMat);
            var bAngle = (j / 6) * Math.PI * 2;
            beam.position.set(
                ox + Math.cos(bAngle) * 0.4,
                oy - 0.1,
                Math.sin(bAngle) * 0.4
            );
            beam.visible = false;
            scene.add(beam);
            this._beams.push({ mesh: beam, angle: bAngle });
        }

        // Summoned entity sphere
        var entityGeo = new THREE.SphereGeometry(0.15, 16, 16);
        var entityMat = new THREE.MeshBasicMaterial({
            color: 0xffeedd, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._entity = new THREE.Mesh(entityGeo, entityMat);
        this._entity.position.set(ox, oy, 0);
        this._entity.scale.set(0, 0, 0);
        scene.add(this._entity);

        // Flash ring for summoning moment
        var flashGeo = new THREE.TorusGeometry(0.3, 0.08, 8, 32);
        var flashMat = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
        });
        this._flash = new THREE.Mesh(flashGeo, flashMat);
        this._flash.rotation.x = Math.PI / 2;
        this._flash.position.set(ox, oy, 0);
        this._flash.scale.set(0, 0, 0);
        scene.add(this._flash);
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x, oy = this._origPos.y, oz = this._origPos.z;

        if (progress < 0.10) {
            // Phase 1: Magic circle appears, starts rotating
            var t = progress / 0.10;
            var ease = 1 - Math.pow(1 - t, 3);
            this._circle.material.opacity = ease * 0.7;
            this._circle.scale.set(ease, ease, ease);
            this._circle.rotation.z = time * 0.5;
        } else if (progress < 0.35) {
            // Phase 2: Symbols orbit, energy beams rise
            var t2 = (progress - 0.10) / 0.25;
            this._circle.material.opacity = 0.7;
            this._circle.rotation.z = time * 1.2;

            for (var i = 0; i < this._symbols.length; i++) {
                var s = this._symbols[i];
                var symT = Math.min(t2 * 2, 1);
                s.mesh.visible = true;
                s.mesh.material.opacity = symT * 0.9;
                var a = s.angle + time * s.speed;
                s.mesh.position.set(
                    ox + Math.cos(a) * s.radius,
                    oy - 0.3 + Math.sin(time * 3 + i) * 0.05,
                    Math.sin(a) * s.radius
                );
                s.mesh.rotation.y = time * 2;
                s.mesh.rotation.z = time * 1.5;
            }

            for (var j = 0; j < this._beams.length; j++) {
                var b = this._beams[j];
                var beamT = Math.max(0, (t2 - 0.3) / 0.7);
                b.mesh.visible = beamT > 0;
                b.mesh.material.opacity = beamT * 0.4;
                b.mesh.scale.y = beamT;
                b.mesh.position.y = oy - 0.1 + beamT * 0.3;
            }
        } else if (progress < 0.60) {
            // Phase 3: Intensity builds, model floats
            var t3 = (progress - 0.35) / 0.25;
            this._circle.rotation.z = time * 2.0;
            this._circle.material.opacity = 0.7 + Math.sin(time * 6) * 0.2;

            model.position.set(ox, oy + t3 * 0.3, oz);
            model.rotation.z = Math.sin(time * 1.5) * 0.03;

            for (var i2 = 0; i2 < this._symbols.length; i2++) {
                var s2 = this._symbols[i2];
                s2.mesh.material.opacity = 0.9;
                var a2 = s2.angle + time * s2.speed * 1.5;
                s2.mesh.position.set(
                    ox + Math.cos(a2) * s2.radius,
                    oy - 0.3 + Math.sin(time * 4 + i2) * 0.08,
                    Math.sin(a2) * s2.radius
                );
                s2.mesh.rotation.y = time * 3;
            }

            for (var j2 = 0; j2 < this._beams.length; j2++) {
                var b2 = this._beams[j2];
                b2.mesh.visible = true;
                b2.mesh.material.opacity = 0.4 + t3 * 0.3 + Math.sin(time * 5 + j2) * 0.1;
                b2.mesh.scale.y = 1.0 + t3 * 0.5;
                b2.mesh.position.y = oy + t3 * 0.2;
            }
        } else if (progress < 0.78) {
            // Phase 4: Summoning flash, entity materializes
            var t4 = (progress - 0.60) / 0.18;
            model.position.set(ox, oy + 0.3, oz);

            this._circle.rotation.z = time * 2.5;
            this._circle.material.opacity = 0.7;

            // Flash at the start of this phase
            if (t4 < 0.3) {
                var flashT = t4 / 0.3;
                this._flash.scale.setScalar(flashT * 3);
                this._flash.material.opacity = (1 - flashT) * 0.9;
                this._flash.rotation.z = time * 4;
            } else {
                this._flash.material.opacity = 0;
            }

            // Entity materializes
            var entityT = Math.min(t4 * 1.5, 1);
            var entityEase = 1 - Math.pow(1 - entityT, 2);
            this._entity.scale.setScalar(entityEase * 1.0);
            this._entity.material.opacity = entityEase * 0.8;
            this._entity.position.set(ox, oy + 0.05, 0);

            // Symbols speed up
            for (var i3 = 0; i3 < this._symbols.length; i3++) {
                var s3 = this._symbols[i3];
                var a3 = s3.angle + time * s3.speed * 2.0;
                s3.mesh.position.set(
                    ox + Math.cos(a3) * s3.radius * (1 - t4 * 0.3),
                    oy - 0.3 + Math.sin(time * 5 + i3) * 0.06,
                    Math.sin(a3) * s3.radius * (1 - t4 * 0.3)
                );
            }

            // Beams intensify
            for (var j3 = 0; j3 < this._beams.length; j3++) {
                this._beams[j3].mesh.material.opacity = 0.7 - t4 * 0.3;
            }
        } else if (progress < 0.92) {
            // Phase 5: Entity pulses, circle fades
            var t5 = (progress - 0.78) / 0.14;
            model.position.set(ox, oy + 0.3 * (1 - t5 * 0.5), oz);

            this._entity.material.opacity = 0.8 + Math.sin(time * 8) * 0.15;
            this._entity.scale.setScalar(1.0 + Math.sin(time * 6) * 0.1);
            this._entity.material.color.setHex(
                Math.sin(time * 4) > 0 ? 0xffeedd : 0xffcc88
            );

            this._circle.material.opacity = 0.7 * (1 - t5);
            this._circle.rotation.z = time * 2.5;

            for (var i4 = 0; i4 < this._symbols.length; i4++) {
                this._symbols[i4].mesh.material.opacity = 0.9 * (1 - t5);
            }
            for (var j4 = 0; j4 < this._beams.length; j4++) {
                this._beams[j4].mesh.material.opacity = 0.4 * (1 - t5);
            }

            this._flash.material.opacity = 0;
        } else {
            // Phase 6: Settle
            var t6 = (progress - 0.92) / 0.08;
            model.position.set(ox, oy + 0.15 * (1 - t6), oz);
            model.rotation.z = 0;

            this._entity.material.opacity = 0.8 * (1 - t6);
            this._entity.scale.setScalar(1.0 + t6 * 0.5);
            this._circle.material.opacity = 0;

            for (var i5 = 0; i5 < this._symbols.length; i5++) {
                this._symbols[i5].mesh.material.opacity = 0;
                this._symbols[i5].mesh.visible = false;
            }
            for (var j5 = 0; j5 < this._beams.length; j5++) {
                this._beams[j5].mesh.material.opacity = 0;
                this._beams[j5].mesh.visible = false;
            }
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._circle) { scene.remove(this._circle); this._circle.geometry.dispose(); this._circle.material.dispose(); }
        if (this._entity) { scene.remove(this._entity); this._entity.geometry.dispose(); this._entity.material.dispose(); }
        if (this._flash) { scene.remove(this._flash); this._flash.geometry.dispose(); this._flash.material.dispose(); }
        if (this._symbols) { this._symbols.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._beams) { this._beams.forEach(function(b) { scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose(); }); }
        this._circle = this._entity = this._flash = this._symbols = this._beams = null;
    }
};
