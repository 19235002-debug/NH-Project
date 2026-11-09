<?php

namespace App\Http\Controllers\Player;

use App\Http\Controllers\Controller;
use App\Models\MasterNinja;
use App\Models\MasterJutsu;
use App\Models\MasterExam;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CodexController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $category = $request->get('cat', 'ninjas');
        $selectedGrade = $request->get('grade', '');
        $search = trim($request->get('q', ''));

        $ninjas = collect();
        $jutsus = collect();

        if ($category === 'ninjas') {
            $query = MasterNinja::query();
            if ($selectedGrade) {
                $query->where('grade', $selectedGrade);
            }
            if ($search) {
                $query->where(function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            }
            $ninjas = $query->orderBy('quality', 'desc')->orderBy('name', 'asc')->paginate(24)->withQueryString();
        } elseif ($category === 'jutsus') {
            $query = MasterJutsu::query();
            if ($selectedGrade) {
                $query->where('grade', $selectedGrade);
            }
            if ($search) {
                $query->where(function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            }
            $jutsus = $query->orderBy('quality', 'desc')->orderBy('name', 'asc')->paginate(24)->withQueryString();
        }

        $stats = [
            'total_ninjas' => MasterNinja::count(),
            'total_jutsus' => MasterJutsu::count(),
            'total_exams' => MasterExam::count()
        ];

        return view('player.codex', compact('user', 'category', 'selectedGrade', 'search', 'ninjas', 'jutsus', 'stats'));
    }
}
