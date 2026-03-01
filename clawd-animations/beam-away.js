export default {
    name: 'Beam Away',
    label: 'beaming',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();
        this.beamGroup = new THREE.Group();
        this.beamGroup.position.copy(this._origPos);
        scene.add(this.beamGroup);
        this.beamCount = 14;
        this.beamRadius = 0.6;
        this.beams = [];
        var cylGeo = new THREE.CylinderGeometry(0.015, 0.015, 2.5, 6);
        var colors = [0xffaa00, 0xff8800, 0xffcc33, 0xffbb11];
        for (var i = 0; i < this.beamCount; i++) {
            var angle = (i / this.beamCount) * Math.PI * 2;
            var r = this.beamRadius + (Math.random() - 0.5) * 0.15;
            var x = Math.cos(angle) * r;
            var z = Math.sin(angle) * r;
            var mat = new THREE.MeshBasicMaterial({
                color: colors[i % colors.length],
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var beam = new THREE.Mesh(cylGeo, mat);
            beam.position.set(x, 1.0, z);
            beam.scale.set(1, 0, 1);
            this.beamGroup.add(beam);
            this.beams.push({ mesh: beam, baseX: x, baseZ: z,
                phaseOffset: Math.random() * Math.PI * 2, speedMult: 0.8 + Math.random() * 0.4 });
        }
        var coreGeo = new THREE.CylinderGeometry(0.25, 0.25, 2.8, 16);
        var coreMat = new THREE.MeshBasicMaterial({
            color: 0xffaa00, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this.coreBeam = new THREE.Mesh(coreGeo, coreMat);
        this.coreBeam.position.set(0, 1.0, 0);
        this.beamGroup.add(this.coreBeam);
        var sparkGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.15, 4);
        this.sparks = [];
        for (var j = 0; j < 20; j++) {
            var sparkMat = new THREE.MeshBasicMaterial({
                color: 0xffdd55, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var spark = new THREE.Mesh(sparkGeo, sparkMat);
            var sa = Math.random() * Math.PI * 2;
            var sr = Math.random() * 0.5;
            spark.position.set(Math.cos(sa) * sr, Math.random() * 2.5, Math.sin(sa) * sr);
            this.beamGroup.add(spark);
            this.sparks.push({ mesh: spark, baseAngle: sa, baseRadius: sr,
                speed: 1.5 + Math.random() * 2.0, phaseOffset: Math.random() * Math.PI * 2 });
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var os = this._origScale, op = this._origPos;
        var beamIntensity, converge = 0;
        if (progress < 0.5) {
            var p = progress / 0.5;
            var easeP = p * p;
            beamIntensity = Math.sin(p * Math.PI);
            var scaleY = 1.0 - easeP * 0.85;
            var scaleXZ = 1.0 + easeP * 0.1;
            model.scale.set(os.x * scaleXZ, os.y * Math.max(0.15, scaleY), os.z * scaleXZ);
            model.position.y = op.y + easeP * 0.3;
            model.visible = p <= 0.7;
        } else {
            var q = (progress - 0.5) / 0.5;
            var easeQ = 1 - (1 - q) * (1 - q);
            beamIntensity = Math.sin((1 - q) * Math.PI);
            converge = easeQ;
            if (q > 0.3) {
                model.visible = true;
                var reassemble = (q - 0.3) / 0.7;
                var easeR = reassemble * reassemble;
                model.scale.set(os.x * (1.1 - easeR * 0.1), os.y * (0.15 + easeR * 0.85), os.z * (1.1 - easeR * 0.1));
                model.position.y = op.y + (1 - easeR) * 0.3;
            } else { model.visible = false; }
        }
        for (var i = 0; i < this.beams.length; i++) {
            var b = this.beams[i], mesh = b.mesh;
            var shimmer = 0.5 + 0.5 * Math.sin(time * 8 * b.speedMult + b.phaseOffset);
            var flicker = 0.7 + 0.3 * Math.sin(time * 15 + b.phaseOffset * 3);
            mesh.material.opacity = beamIntensity * shimmer * flicker * 0.8;
            mesh.scale.set(0.8 + shimmer * 0.4, beamIntensity * (0.6 + shimmer * 0.4), 0.8 + shimmer * 0.4);
            mesh.position.x = b.baseX * (1 - converge * 0.7) + Math.sin(time * 3 + b.phaseOffset) * 0.05 * (1 - converge);
            mesh.position.z = b.baseZ * (1 - converge * 0.7) + Math.cos(time * 3.7 + b.phaseOffset) * 0.05 * (1 - converge);
            mesh.position.y = 1.0 + Math.sin(time * 2 + b.phaseOffset) * 0.1;
        }
        this.coreBeam.material.opacity = beamIntensity * 0.15;
        this.coreBeam.scale.set(0.8 + Math.sin(time * 6) * 0.2, beamIntensity, 0.8 + Math.cos(time * 6) * 0.2);
        for (var j = 0; j < this.sparks.length; j++) {
            var s = this.sparks[j], sm = s.mesh;
            sm.material.opacity = beamIntensity * (0.3 + 0.7 * Math.abs(Math.sin(time * s.speed + s.phaseOffset)));
            sm.position.y = (time * s.speed + s.phaseOffset) % 2.5;
            var sparkR = s.baseRadius * (1 - converge * 0.6);
            var sparkAngle = s.baseAngle + time * 0.5;
            sm.position.x = Math.cos(sparkAngle) * sparkR;
            sm.position.z = Math.sin(sparkAngle) * sparkR;
            sm.scale.setScalar(0.5 + Math.sin(time * 10 + s.phaseOffset) * 0.5);
        }
        model.rotation.y = Math.sin(time * 0.5) * 0.05 * beamIntensity;
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.visible = true;
        if (this.beamGroup) {
            this.beamGroup.traverse(function(child) {
                if (child.isMesh) { child.geometry.dispose(); child.material.dispose(); }
            });
            scene.remove(this.beamGroup);
            this.beamGroup = null;
        }
        this.beams = null; this.sparks = null; this.coreBeam = null;
    }
};
