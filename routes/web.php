<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Player\PlayerDashboardController;
use App\Http\Controllers\Player\GachaController;
use App\Http\Controllers\Player\TeamController;
use App\Http\Controllers\Player\CombineController;
use App\Http\Controllers\Player\ArenaController;
use App\Http\Controllers\Player\CodexController;
use App\Http\Controllers\Player\ApkController;
use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\PlayerManagementController;
use App\Http\Controllers\Admin\NoticeManagementController;
use App\Http\Controllers\Admin\PacketInspectorController;
use App\Http\Controllers\Game\GameClientAdapterController;

/*
|--------------------------------------------------------------------------
| Mobile APK Game Client Routes (Cocos2d-x APK Compatibility)
|--------------------------------------------------------------------------
*/
Route::withoutMiddleware([\App\Http\Middleware\VerifyCsrfToken::class])->group(function () {
    Route::match(['get', 'post'], '/game/checkClientVersion', [GameClientAdapterController::class, 'checkClientVersion']);
    Route::match(['get', 'post'], '/game/servers', [GameClientAdapterController::class, 'servers']);
    Route::match(['get', 'post'], '/game/notice', [GameClientAdapterController::class, 'notice']);
    Route::match(['get', 'post'], '/notice', [GameClientAdapterController::class, 'notice']);
    Route::match(['get', 'post'], '/game/banStatus', [GameClientAdapterController::class, 'banStatus']);
    Route::match(['get', 'post'], '/game/createRole', [GameClientAdapterController::class, 'createRole']);
    Route::match(['get', 'post'], '/game/login', [GameClientAdapterController::class, 'handleAuth']);
    Route::match(['get', 'post'], '/game/lyto/login', [GameClientAdapterController::class, 'handleAuth']);
    Route::match(['get', 'post'], '/game/register', [GameClientAdapterController::class, 'handleAuth']);
    Route::match(['get', 'post'], '/game/lyto/register', [GameClientAdapterController::class, 'handleAuth']);
    Route::match(['get', 'post'], '/game/{any}', [GameClientAdapterController::class, 'fallback'])->where('any', '.*');
});

Route::get('/download', [ApkController::class, 'download'])->name('public.download');
Route::get('/download-apk', [ApkController::class, 'download']);

/*
|--------------------------------------------------------------------------
| Universal Static Asset Proxy Route (php artisan serve & subfolder safety)
|--------------------------------------------------------------------------
*/
Route::get('/ninja/{path}', function ($path) {
    $file = public_path($path);
    if (file_exists($file) && is_file($file)) {
        return response()->file($file);
    }
    abort(404);
})->where('path', '.*');

/*
|--------------------------------------------------------------------------
| Web Authentication Routes
|--------------------------------------------------------------------------
*/
Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
Route::post('/login', [AuthController::class, 'login']);
Route::get('/register', [AuthController::class, 'showRegister'])->name('register');
Route::post('/register', [AuthController::class, 'register']);
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
Route::get('/quick-switch/{role}', [AuthController::class, 'quickLoginAs'])->name('quick.switch');

// Root redirect
Route::get('/', function () {
    if (Auth::check()) {
        return Auth::user()->isAdmin() 
            ? redirect()->route('admin.dashboard') 
            : redirect()->route('player.dashboard');
    }
    return redirect()->route('login');
});

/*
|--------------------------------------------------------------------------
| Player / Shinobi User Routes (Protected by auth)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth'])->prefix('player')->name('player.')->group(function () {
    Route::get('/dashboard', [PlayerDashboardController::class, 'index'])->name('dashboard');
    Route::post('/ramen', [PlayerDashboardController::class, 'claimRamen'])->name('ramen');
    Route::post('/notice/{id}/claim', [PlayerDashboardController::class, 'claimNoticeGold'])->name('notice.claim');

    // Gacha
    Route::get('/gacha', [GachaController::class, 'index'])->name('gacha');
    Route::get('/gacha/info', [GachaController::class, 'info'])->name('gacha.info');
    Route::post('/gacha/draw', [GachaController::class, 'draw'])->name('gacha.draw');
    Route::post('/gacha/draw-jutsu', [GachaController::class, 'drawJutsu'])->name('gacha.draw-jutsu');

    // Shinobi Team
    Route::get('/team', [TeamController::class, 'index'])->name('team');
    Route::post('/team/{id}/assign/{slot}', [TeamController::class, 'assignSlot'])->name('team.assign-slot');
    Route::post('/team/{id}/remove', [TeamController::class, 'removeSlot'])->name('team.remove-slot');
    Route::post('/team/{id}/deploy/{slot}', [TeamController::class, 'assignDeploy'])->name('team.assign-deploy');
    Route::post('/team/{id}/undeploy', [TeamController::class, 'removeDeploy'])->name('team.remove-deploy');
    Route::post('/team/{id}/set-main', [TeamController::class, 'setMain'])->name('team.set-main');
    Route::post('/team/{id}/upgrade', [TeamController::class, 'upgrade'])->name('team.upgrade');
    Route::post('/team/{id}/equip-jutsu', [TeamController::class, 'equipJutsu'])->name('team.equip-jutsu');
    Route::post('/team/{id}/unequip-jutsu/{slotType}', [TeamController::class, 'unequipJutsu'])->name('team.unequip-jutsu');

    // Combine
    Route::get('/combine', [CombineController::class, 'index'])->name('combine');
    Route::post('/combine', [CombineController::class, 'execute'])->name('combine.execute');

    // Arena & Exam
    Route::get('/arena', [ArenaController::class, 'index'])->name('arena');
    Route::post('/arena/challenge/{floor}', [ArenaController::class, 'challenge'])->name('arena.challenge');

    // Codex
    Route::get('/codex', [CodexController::class, 'index'])->name('codex');

    // APK Download
    Route::get('/apk', [ApkController::class, 'index'])->name('apk');
    Route::get('/apk/download', [ApkController::class, 'download'])->name('apk.download');
});

/*
|--------------------------------------------------------------------------
| Game Master (Admin / GM) Routes (Protected by auth & admin middleware)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/dashboard', [AdminDashboardController::class, 'index'])->name('dashboard');

    // Player Management
    Route::get('/players', [PlayerManagementController::class, 'index'])->name('players');
    Route::post('/players/{id}/update', [PlayerManagementController::class, 'update'])->name('players.update');
    Route::post('/players/{id}/toggle-ban', [PlayerManagementController::class, 'toggleBan'])->name('players.toggle-ban');
    Route::post('/players/{id}/add-ninja', [PlayerManagementController::class, 'addNinja'])->name('players.add-ninja');
    Route::post('/players/ninja/{ninjaId}/level', [PlayerManagementController::class, 'updateNinjaLevel'])->name('players.ninja-level');

    // Server Notices
    Route::get('/notices', [NoticeManagementController::class, 'index'])->name('notices');
    Route::post('/notices', [NoticeManagementController::class, 'store'])->name('notices.store');
    Route::post('/notices/{id}/airdrop', [NoticeManagementController::class, 'airdrop'])->name('notices.airdrop');
    Route::post('/notices/{id}/toggle', [NoticeManagementController::class, 'toggle'])->name('notices.toggle');
    Route::delete('/notices/{id}', [NoticeManagementController::class, 'destroy'])->name('notices.destroy');

    // Packet Inspector
    Route::get('/inspector', [PacketInspectorController::class, 'index'])->name('inspector');
    Route::post('/inspector/clear', [PacketInspectorController::class, 'clear'])->name('inspector.clear');
});
