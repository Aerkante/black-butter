<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\ChartController;
use App\Http\Controllers\DistrictController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ZoneController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::group(
    [
        'prefix' => 'auth',
    ], function () {
    Route::group(
        [
            'middleware' => 'auth:api',
        ], function () {
        Route::post('refresh', [AuthController::class, 'refresh']);
        Route::post('me', [AuthController::class, 'userProfile']);
    });
    Route::post('login', [AuthController::class, 'login']);
    Route::post('register', [AuthController::class, 'register']);

}
);

Route::post('logout', [AuthController::class, 'logout']);
Route::apiResource('zones', ZoneController::class);
Route::apiResource('districts', DistrictController::class);
Route::apiResource('reports', ReportController::class);
Route::get('charts', [ChartController::class, 'index']);



