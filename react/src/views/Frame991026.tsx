import { useNavigate } from "react-router";
import { getPathByGuid } from "@/router/routes";
import { withStopPropagation } from "@/utils/utils";
import "@/styles/Frame991026.css";
const Frame991026 = () => {
    const navigate = useNavigate();

    const click_99_1027 = () => {
        navigate(getPathByGuid("94:940"), {
            state: {
                from: "99:1027",
                et: "c"
            }
        });
    };

    return (
        <div className="scroll-container">
            <div id="99_1026" className="Pixso-frame-99_1026">
                <div
                    id="99_1027"
                    className="Pixso-rectangle-99_1027"
                    onClick={withStopPropagation(click_99_1027)}
                ></div>
                <div id="99_1028" className="Pixso-frame-99_1028">
                    <div className="frame-content-99_1028">
                        <div
                            id="99_1029"
                            className="Pixso-vector-99_1029"
                        ></div>
                    </div>
                </div>
                <p id="99_1031" className="Pixso-paragraph-99_1031">
                    {"Heating"}
                </p>
            </div>
        </div>
    );
};
export default Frame991026;
