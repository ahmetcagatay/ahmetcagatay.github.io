import * as CANNON from 'https://cdn.skypack.dev/cannon-es';

import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

const canvasEl = document.querySelector('#canvas');
const scoreResult = document.querySelector('#score-result');
// const rollBtn = document.querySelector('#roll-btn');

let renderer, scene, camera, diceMesh, physicsWorld;

const params = {
    numberOfDice: 2,
    segments: 40,
    edgeRadius: .07,
    notchRadius: .12,
    notchDepth: .1,
};

const diceArray = [];

initPhysics();
initScene();

window.addEventListener('resize', updateSceneSize);
window.addEventListener('dblclick', () => throwDice());
document.getElementById('polar-area-chart').addEventListener('click', () => throwDice());

function initScene() {

    renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        canvas: canvasEl
    });
    renderer.shadowMap.enabled = true
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, .1, 300)
    camera.position.set(0, .5, 4).multiplyScalar(7);
    camera.rotateX(-0.3);

    updateSceneSize();

    const ambientLight = new THREE.AmbientLight(0xffffff, .5);
    scene.add(ambientLight);
    const topLight = new THREE.PointLight(0xffffff, .5);
    topLight.position.set(10, 15, 0);
    topLight.castShadow = true;
    topLight.shadow.mapSize.width = 2048;
    topLight.shadow.mapSize.height = 2048;
    topLight.shadow.camera.near = 5;
    topLight.shadow.camera.far = 400;
    scene.add(topLight);

    createFloor();
    diceMesh = createDiceMesh();
    for (let i = 0; i < params.numberOfDice; i++) {
        diceArray.push(createDice());
        addDiceEvents(diceArray[i]);
    }

    throwDice();

    render();
    
}

function initPhysics() {
    physicsWorld = new CANNON.World({
        allowSleep: true,
        gravity: new CANNON.Vec3(0, -50, 0),
    })
    physicsWorld.defaultContactMaterial.restitution = .3;
}


function createFloor() {
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(1000, 1000),
        new THREE.ShadowMaterial({
            opacity: .1
        })
    )
    floor.receiveShadow = true;
    floor.position.y = -7;
    floor.quaternion.setFromAxisAngle(new THREE.Vector3(-1, 0, 0), Math.PI * .5);
    scene.add(floor);

    const floorBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Plane(),
    });
    floorBody.position.copy(floor.position);
    floorBody.quaternion.copy(floor.quaternion);
    physicsWorld.addBody(floorBody);
}

function createDiceMesh() {
    const boxMaterialOuter = new THREE.MeshStandardMaterial({
        color: 0xeeeeee,
    })
    const boxMaterialInner = new THREE.MeshStandardMaterial({
        color: 0x000000,
        roughness: 0,
        metalness: 1,
        side: THREE.DoubleSide
    })

    const diceMesh = new THREE.Group();
    const innerMesh = new THREE.Mesh(createInnerGeometry(), boxMaterialInner);
    const outerMesh = new THREE.Mesh(createBoxGeometry(), boxMaterialOuter);
    outerMesh.castShadow = true;
    diceMesh.add(innerMesh, outerMesh);

    return diceMesh;
}

function createDice() {
    const mesh = diceMesh.clone();
    scene.add(mesh);

    const body = new CANNON.Body({
        mass: 1,
        shape: new CANNON.Box(new CANNON.Vec3(.5, .5, .5)),
        sleepTimeLimit: .1
    });
    physicsWorld.addBody(body);

    return { mesh, body };
}

function createBoxGeometry() {

    let boxGeometry = new THREE.BoxGeometry(1, 1, 1, params.segments, params.segments, params.segments);

    const positionAttr = boxGeometry.attributes.position;
    const subCubeHalfSize = .5 - params.edgeRadius;


    for (let i = 0; i < positionAttr.count; i++) {

        let position = new THREE.Vector3().fromBufferAttribute(positionAttr, i);

        const subCube = new THREE.Vector3(Math.sign(position.x), Math.sign(position.y), Math.sign(position.z)).multiplyScalar(subCubeHalfSize);
        const addition = new THREE.Vector3().subVectors(position, subCube);

        if (Math.abs(position.x) > subCubeHalfSize && Math.abs(position.y) > subCubeHalfSize && Math.abs(position.z) > subCubeHalfSize) {
            addition.normalize().multiplyScalar(params.edgeRadius);
            position = subCube.add(addition);
        } else if (Math.abs(position.x) > subCubeHalfSize && Math.abs(position.y) > subCubeHalfSize) {
            addition.z = 0;
            addition.normalize().multiplyScalar(params.edgeRadius);
            position.x = subCube.x + addition.x;
            position.y = subCube.y + addition.y;
        } else if (Math.abs(position.x) > subCubeHalfSize && Math.abs(position.z) > subCubeHalfSize) {
            addition.y = 0;
            addition.normalize().multiplyScalar(params.edgeRadius);
            position.x = subCube.x + addition.x;
            position.z = subCube.z + addition.z;
        } else if (Math.abs(position.y) > subCubeHalfSize && Math.abs(position.z) > subCubeHalfSize) {
            addition.x = 0;
            addition.normalize().multiplyScalar(params.edgeRadius);
            position.y = subCube.y + addition.y;
            position.z = subCube.z + addition.z;
        }

        const notchWave = (v) => {
            v = (1 / params.notchRadius) * v;
            v = Math.PI * Math.max(-1, Math.min(1, v));
            return params.notchDepth * (Math.cos(v) + 1.);
        }
        const notch = (pos) => notchWave(pos[0]) * notchWave(pos[1]);

        const offset = .23;

        if (position.y === .5) {
            position.y -= notch([position.x, position.z]);
        } else if (position.x === .5) {
            position.x -= notch([position.y + offset, position.z + offset]);
            position.x -= notch([position.y - offset, position.z - offset]);
        } else if (position.z === .5) {
            position.z -= notch([position.x - offset, position.y + offset]);
            position.z -= notch([position.x, position.y]);
            position.z -= notch([position.x + offset, position.y - offset]);
        } else if (position.z === -.5) {
            position.z += notch([position.x + offset, position.y + offset]);
            position.z += notch([position.x + offset, position.y - offset]);
            position.z += notch([position.x - offset, position.y + offset]);
            position.z += notch([position.x - offset, position.y - offset]);
        } else if (position.x === -.5) {
            position.x += notch([position.y + offset, position.z + offset]);
            position.x += notch([position.y + offset, position.z - offset]);
            position.x += notch([position.y, position.z]);
            position.x += notch([position.y - offset, position.z + offset]);
            position.x += notch([position.y - offset, position.z - offset]);
        } else if (position.y === -.5) {
            position.y += notch([position.x + offset, position.z + offset]);
            position.y += notch([position.x + offset, position.z]);
            position.y += notch([position.x + offset, position.z - offset]);
            position.y += notch([position.x - offset, position.z + offset]);
            position.y += notch([position.x - offset, position.z]);
            position.y += notch([position.x - offset, position.z - offset]);
        }

        positionAttr.setXYZ(i, position.x, position.y, position.z);
    }


    boxGeometry.deleteAttribute('normal');
    boxGeometry.deleteAttribute('uv');
    boxGeometry = BufferGeometryUtils.mergeVertices(boxGeometry);

    boxGeometry.computeVertexNormals();

    return boxGeometry;
}

function createInnerGeometry() {
    const baseGeometry = new THREE.PlaneGeometry(1 - 2 * params.edgeRadius, 1 - 2 * params.edgeRadius);
    const offset = .48;
    return BufferGeometryUtils.mergeBufferGeometries([
        baseGeometry.clone().translate(0, 0, offset),
        baseGeometry.clone().translate(0, 0, -offset),
        baseGeometry.clone().rotateX(.5 * Math.PI).translate(0, -offset, 0),
        baseGeometry.clone().rotateX(.5 * Math.PI).translate(0, offset, 0),
        baseGeometry.clone().rotateY(.5 * Math.PI).translate(-offset, 0, 0),
        baseGeometry.clone().rotateY(.5 * Math.PI).translate(offset, 0, 0),
    ], false);
}

function addDiceEvents(dice) {
    dice.body.addEventListener('sleep', (e) => {

        dice.body.allowSleep = false;

        
        const euler = new CANNON.Vec3();
        e.target.quaternion.toEuler(euler);

        const eps = .1;
        let isZero = (angle) => Math.abs(angle) < eps;
        let isHalfPi = (angle) => Math.abs(angle - .5 * Math.PI) < eps;
        let isMinusHalfPi = (angle) => Math.abs(.5 * Math.PI + angle) < eps;
        let isPiOrMinusPi = (angle) => (Math.abs(Math.PI - angle) < eps || Math.abs(Math.PI + angle) < eps);


        if (isZero(euler.z)) {
            if (isZero(euler.x)) {
                showRollResults(1);
            } else if (isHalfPi(euler.x)) {
                showRollResults(4);
            } else if (isMinusHalfPi(euler.x)) {
                showRollResults(3);
            } else if (isPiOrMinusPi(euler.x)) {
                showRollResults(6);
            } else {
                // landed on edge => wait to fall on side and fire the event again
                dice.body.allowSleep = true;
            }
        } else if (isHalfPi(euler.z)) {
            showRollResults(2);
        } else if (isMinusHalfPi(euler.z)) {
            showRollResults(5);
        } else {
            // landed on edge => wait to fall on side and fire the event again
            dice.body.allowSleep = true;
        }
        
    });
}

function showRollResults(score) {
    if (scoreResult.innerHTML === '') {
        scoreResult.innerHTML += score;
    }
    else {
        scoreResult.innerHTML += ('+' + score);
    }
}

function render() {
    physicsWorld.fixedStep();

    for (const dice of diceArray) {
        dice.mesh.position.copy(dice.body.position)
        dice.mesh.quaternion.copy(dice.body.quaternion)
    }

    renderer.render(scene, camera);
    requestAnimationFrame(render);
}

function updateSceneSize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function throwDice(additionalScore = 0, color = "#fdfdfd") {
    if (color) { changeDiceColor(color); }
    scoreResult.innerHTML = '';

    let totalScore = additionalScore; // Zarların ve eklenen skorun toplamını hesaplamak için bir değişken


    diceArray.forEach((d, dIdx) => {
        d.body.velocity.setZero();
        d.body.angularVelocity.setZero();

        d.body.position = new CANNON.Vec3(1, dIdx * 5, 7);
        d.mesh.position.copy(d.body.position);

        d.mesh.rotation.set(2 * Math.PI * Math.random(), 0, 2 * Math.PI * Math.random())
        d.body.quaternion.copy(d.mesh.quaternion);

        const force = 3 + 5 * Math.random();
        d.body.applyImpulse(
            new CANNON.Vec3(-force, force, 10),
            new CANNON.Vec3(0, 0, .2)
        );

        d.body.allowSleep = true;

        // // Örnek bir zar sonucu, gerçek değer hesaplamaları yerine geçici olarak kullanılıyor
        // const diceScore = Math.floor(Math.random() * 6) + 1; // 1 ile 6 arasında rastgele bir sayı
        totalScore;
    });

    // Toplam skoru göster
    scoreResult.innerHTML = '' + totalScore.toString();
}

function changeDiceColor(color) {
    // Eğer bir renk belirtilmemişse veya geçersiz ise, varsayılan beyaz rengi kullan
    const defaultColor = new THREE.Color(0xeeeeee);

    // Eğer geçerli bir renk belirtilmişse, üç renk kanalı (R, G, B) değerlerini al
    const newColor = color ? new THREE.Color(color).lerp(defaultColor, 0.5) : defaultColor;



    // Her bir zarın renklerini değiştir
    diceArray.forEach(dice => {
        // İç ve dış zar olmak üzere iki farklı materyal vardır
        dice.mesh.children.forEach(child => {
            if (child.material instanceof THREE.MeshStandardMaterial) {
                // Eğer materyal `THREE.MeshStandardMaterial` ise, rengi değiştir
                child.material.color.copy(newColor);
            }
        });
    });
}



let isReturning = false; // Zarların geri dönüş durumunu kontrol etmek için bir bayrak

function returnDiceToView() {
    const returnPosition = new CANNON.Vec3(0, 0, 0); // Zarların döneceği hedef konum
    const returnQuaternion = new CANNON.Quaternion().setFromEuler(0, 0, 0); // Zarların döneceği hedef yön
    const returnSpeed = 0.7; // Interpolasyon hızı, 0 ile 1 arasında bir değer

    if (isReturning) return; // Eğer zaten geri dönüş işlemi başladıysa, işlevi tekrar başlatma
    isReturning = true;

    function animateReturn() {
        let allReturned = true;
        diceArray.forEach(dice => {
            dice.body.position.lerp(returnPosition, returnSpeed, dice.body.position);
            dice.body.quaternion.slerp(returnQuaternion, returnSpeed, dice.body.quaternion);
            dice.mesh.position.copy(dice.body.position);
            dice.mesh.quaternion.copy(dice.body.quaternion);

            // Hedefe yeterince yakın olup olmadığını kontrol et
            if (dice.body.position.distanceTo(returnPosition) > 0.01) {
                allReturned = false;
            }
        });

        if (!allReturned) {
            requestAnimationFrame(animateReturn); // Tüm zarlar hedefe ulaşana kadar animasyonu sürdür
        } else {
            isReturning = false; // Geri dönüş işlemi tamamlandı
        }
    }
    console.log("çek");
    setTimeout(() => { // Zarları atıştan belirli bir süre sonra geri getir
        animateReturn();
    }, 3000); // 3 saniye sonra zarları geri getir
}


const ctx = document.getElementById('polar-area-chart').getContext('2d');

const scoreResultElement = document.getElementById('score-result');
const scoreTextElement = document.getElementById('score-text');

const categories = [
    { name: 'INTELLIGENCE', sub: { Craft: 0, Teach: 2, Learn: 1 }, color: 'rgb(68, 114, 196)' },
    { name: 'WISDOM', sub: { Magic: 0, Spell: 0, Memory: 2 }, color: 'rgb(32, 56, 100)' },
    { name: 'WILLPOWER', sub: { Mystic: 0, Focus: 1, Mental: 2 }, color: 'rgb(112, 48, 160)' },
    { name: 'PERCEPTION', sub: { Ranged: 0, Art: 2, Detect: 0 }, color: 'rgb(176, 99, 148)' },
    { name: 'LUCK', sub: { Critic: 2, Call: 0, Try: 0 }, color: 'rgb(59, 56, 56)' },
    { name: 'CHARISMA', sub: { Speak: 0, Drama: 0, Lead: 3 }, color: 'rgb(132, 60, 12)' },
    { name: 'STRENGTH', sub: { Muscle: 0, Martial: 0, Heavy: 4 }, color: 'rgb(204, 0, 0)' },
    { name: 'CONSTITUTION', sub: { Heal: 2, Live: 2, Pole: 0 }, color: 'rgb(255, 51, 0)' },
    { name: 'AGILITY', sub: { Acrobat: 2, Karate: 0, Shield: 0 }, color: 'rgb(255, 192, 0)' },
    { name: 'SPEED', sub: { Hand: 2, Stealth: 1, Light: 0 }, color: 'rgb(112, 173, 71)' }
];

const subCategories = categories.flatMap(category =>
    Object.keys(category.sub).map(sub => `${sub} - (${category.name})`)
);

const subCategoryColors = categories.flatMap(category =>
    Object.keys(category.sub).map(sub => category.color)
);

const dataValues = categories.flatMap(category =>
    Object.values(category.sub)
);


const backgroundColors = subCategories.map((sub, i) =>
    `${subCategoryColors[i].replace('rgb', 'rgba').replace(')', ', 0.8)')}`
);

const borderColors = subCategoryColors;

new Chart(ctx, {
    type: 'polarArea',
    data: {
        labels: subCategories,
        datasets: [{
            data: dataValues,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 1
        }]
    },
    options: {
        onClick: (event, activeElements) => {
            if (activeElements.length > 0) {
                const activeIndex = activeElements[0].index;
                console.log(activeIndex);
                const activeValue = dataValues[activeIndex];
                const activeColor = subCategoryColors[activeIndex];
                const activeText = subCategories[activeIndex];
                throwDice(activeValue, activeColor);
                scoreTextElement.innerHTML = activeText;
                var scoreElements = document.getElementsByClassName('score');
                for (var i = 0; i < scoreElements.length; i++) {
                    scoreElements[i].style.borderColor = activeColor; // İstediğiniz renk kodunu kullanabilirsiniz
                    scoreElements[i].style.color = activeColor; // İstediğiniz renk kodunu kullanabilirsiniz
                }


            }
        },
        scales: {
            r: {
                max: dataValues, min: -1,
                ticks: {
                    stepSize: 1,
                    display: false
                },
                grid: {
                    offset: true
                }
            }
        },
        plugins: {
            datalabels: {
                backgroundColor: context => context.dataset.backgroundColor,
                borderRadius: 4,
                color: 'black',
                font: { weight: 'bold' },
                // formatter: (value) => value,
                formatter: (value, context) => {
                    // Bu fonksiyon ile etiket metnini özelleştirebilirsiniz
                    // Örneğin, 'heavy' etiketi için özel bir işlem yapmak istiyorsanız:
                    if (context.chart.data.labels[context.dataIndex] === 'Heavy - (STRENGTH)') {
                        return '★ ' + value; // 'Heavy' etiketli veri noktası için yıldız ekler
                    }
                    return value; // Diğer tüm veri noktaları için sadece değeri gösterir
                }
            },
            legend: {
                display: false
            }
        }
    }
});


function createHorizontalWalls() {
    const wallThickness = 0.1; // Duvarların kalınlığı
    const wallDepth = 40; // Duvarların derinliği, yani "yukarıdan aşağıya" uzanan boyut
    const arenaSize = 8; // Arena boyutu, yani duvarların oluşturduğu kutunun genişliği ve uzunluğu

    // Duvarların CANNON.js için pozisyonları ve boyutları (Yatay düzlemde)
    const wallPositions = [
        { pos: [window.innerWidth/200, 0, 0], size: [wallThickness, arenaSize, wallDepth] }, // Sağ duvar
        { pos: [-window.innerWidth / 200, 0, 0], size: [wallThickness, arenaSize, wallDepth] }, // Sol duvar
        // // { pos: [0, arenaSize / 2, 0], size: [arenaSize, wallThickness, wallDepth] }, // Ön duvar
        { pos: [0, -arenaSize / 2, 0], size: [100, wallThickness, wallDepth] },  // Arka duvar
        { pos: [0, 0, -2], size: [100, 100, 1] },  // Arka duvar
        { pos: [0, 0, 17], size: [100, 100, 1] }  // Arka duvar
    ];

    wallPositions.forEach(wall => {
        // Fizik duvarını yarat
        const wallShape = new CANNON.Box(new CANNON.Vec3(...wall.size.map(x => x / 2)));
        const wallBody = new CANNON.Body({
            mass: 0,
            position: new CANNON.Vec3(...wall.pos),
            shape: wallShape,
        });
        physicsWorld.addBody(wallBody);

        // Görsel duvarı yarat
        const wallGeometry = new THREE.BoxGeometry(...wall.size);
        // const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 }); // Yeşil renk
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ff00, // Duvarların rengi, örneğin yeşil
            transparent: true,
            opacity: 0 // Duvarların yarı şeffaf olması için
        });
        
        const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
        wallMesh.position.set(...wall.pos);
        scene.add(wallMesh);
    });
}

createHorizontalWalls();
