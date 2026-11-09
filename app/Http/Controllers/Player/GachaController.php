<?php

namespace App\Http\Controllers\Player;

use App\Http\Controllers\Controller;
use App\Services\GachaService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Exception;

class GachaController extends Controller
{
    protected GachaService $gachaService;

    public function __construct(GachaService $gachaService)
    {
        $this->gachaService = $gachaService;
    }

    public function index()
    {
        $user = Auth::user();
        $gachaInfo = $this->gachaService->getInfo($user);

        return view('player.gacha', compact('user', 'gachaInfo'));
    }

    public function info()
    {
        $user = Auth::user();
        $info = $this->gachaService->getInfo($user);

        return response()->json([
            'status' => 'success',
            'data' => $info
        ]);
    }

    public function draw(Request $request)
    {
        $request->validate([
            'hut_type' => 'required|string|in:basic,advanced,special,crane,crane_10x'
        ]);

        $user = Auth::user();

        try {
            $result = $this->gachaService->pull($user, $request->hut_type);

            return response()->json([
                'status' => 'success',
                'message' => 'Rekrutmen Shinobi berhasil!',
                'data' => $result
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 400);
        }
    }

    public function drawJutsu(Request $request)
    {
        $request->validate([
            'type' => 'required|string|in:ninjutsu_silver,ninjutsu_gold,summon,biju'
        ]);

        $user = Auth::user();

        try {
            $result = $this->gachaService->pullJutsu($user, $request->type);

            return response()->json([
                'status' => 'success',
                'message' => "Selamat! Anda berhasil mempelajari {$result['jutsu']['name']} ({$result['jutsu']['grade']}-Rank)!",
                'data' => $result
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 400);
        }
    }
}
