<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\{User};
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\{Auth, DB, Hash};
use Throwable;
use Validator;


class AuthController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api', ['except' => ['login', 'validateExpirationCode', 'forgot', 'register',]]);
    }

    /**
     * @throws Throwable
     */
    public function userProfile(): JsonResponse
    {
        $user_id = Auth::id();
        $token = auth()->tokenById($user_id);
        return $this->createNewToken($token);
    }

    /**
     * Cria uma nova estrutura de token.
     *
     * @param string $token
     * @return JsonResponse
     */
    protected function createNewToken($token): JsonResponse
    {
        $user = User::find(auth()->id());

        return response()->json(['access_token' => $token, 'token_type' => 'bearer', 'expires_in' => auth()->factory()->getTTL() * 60, 'user' => $user]);
    }

    /**
     * @throws Throwable
     */
    public function register(Request $request): JsonResponse
    {
        try {
            DB::beginTransaction();
            User::create([...$request->all(), 'password' => Hash::make($request->password)]);

            $loginResponse = $this->login($request);

            if ($loginResponse) {
                DB::commit();
                return $loginResponse;
            } else
                DB::rollBack();

            return $loginResponse;
        } catch (Throwable $th) {
            DB::rollback();
            throw $th;
        }
    }

    /**
     * Get a JWT via given credentials.
     *
     * @return JsonResponse
     */
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required',
            'password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $credentials = $validator->validated();

        if (!$token = auth()->attempt($credentials)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        return $this->createNewToken($token);
    }

}
